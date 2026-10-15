"""Build local wheels from installed packages. Do not change the source environment."""
import argparse
import base64
import csv
import hashlib
import importlib.metadata as metadata
import io
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import zipfile

from packaging.requirements import Requirement
from packaging.tags import parse_tag, sys_tags

PROJECT = Path(__file__).resolve().parents[1]
TARGET = PROJECT / '.venv' / 'Scripts' / 'python.exe'
WHEELS = PROJECT / '.offline-wheels'
UV = Path(shutil.which('uv') or shutil.which('uv.exe') or 'uv.exe')


def packages(roots):
    pending, found = list(roots), {}
    while pending:
        dist = metadata.distribution(pending.pop())
        name = dist.metadata['Name'].lower().replace('_', '-')
        if name in found:
            continue
        found[name] = dist
        for text in dist.requires or []:
            requirement = Requirement(text)
            if requirement.marker is None or requirement.marker.evaluate({'extra': ''}):
                dependency = metadata.distribution(requirement.name)
                if dependency.version not in requirement.specifier:
                    raise RuntimeError('Dependency version mismatch: ' + text)
                pending.append(requirement.name)
    return list(found.values())


def build(dist):
    root = Path(dist.locate_file('')).resolve()
    name = re.sub(r'[-_.]+', '_', dist.metadata['Name'])
    available = set().union(*(parse_tag(t.strip()) for t in re.findall(r'^Tag: (.+)$', dist.read_text('WHEEL'), re.MULTILINE)))
    tag = str(next(t for t in sys_tags() if t in available))
    destination = WHEELS / f'{name}-{dist.version}-{tag}.whl'
    if destination.is_file():
        with zipfile.ZipFile(destination) as existing:
            entries = existing.namelist()
            metadata_name = next(p for p in entries if p.endswith('.dist-info/METADATA'))
            if existing.read(metadata_name).decode('utf-8').replace('\r\n', '\n') != dist.read_text('METADATA').replace('\r\n', '\n'):
                raise RuntimeError('Existing wheel metadata does not match: ' + str(destination))
            if not any(p.endswith('.dist-info/RECORD') for p in entries):
                raise RuntimeError('Existing wheel RECORD is missing: ' + str(destination))
        print('Reused:', destination.name, flush=True)
        return
    temporary = destination.with_suffix('.part')
    records, record_name = [], None
    with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_STORED, allowZip64=True) as wheel:
        for item in dist.files or []:
            # Windows RECORD entries can use backslashes. Normalize before checking parents.
            relative = PurePosixPath(str(item).replace('\\', '/'))
            # Console entry points are created by the installer for the new environment.
            # External manual pages are not needed for this runtime.
            if '..' in relative.parts or relative.is_absolute() or relative.suffix == '.pyc' or '__pycache__' in relative.parts:
                continue
            archive_name = relative.as_posix()
            if archive_name.endswith('.dist-info/RECORD'):
                record_name = archive_name
                continue
            if archive_name.endswith(('.dist-info/INSTALLER', '.dist-info/REQUESTED', '.dist-info/direct_url.json')):
                continue
            source = Path(dist.locate_file(item)).resolve()
            if not source.is_relative_to(root) or not source.is_file():
                raise RuntimeError('Missing or invalid source file: ' + str(source))
            digest, size = hashlib.sha256(), 0
            with source.open('rb') as incoming, wheel.open(archive_name, 'w', force_zip64=True) as outgoing:
                for block in iter(lambda: incoming.read(8 * 1024 * 1024), b''):
                    outgoing.write(block)
                    digest.update(block)
                    size += len(block)
            encoded = base64.urlsafe_b64encode(digest.digest()).rstrip(b'=').decode()
            records.append([archive_name, 'sha256=' + encoded, size])
        if record_name is None:
            raise RuntimeError('Package RECORD is missing.')
        stream = io.StringIO(newline='')
        writer = csv.writer(stream)
        writer.writerows(records + [[record_name, '', '']])
        wheel.writestr(record_name, stream.getvalue())
    temporary.replace(destination)
    print('Prepared:', destination.name, flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--install', action='store_true', help='Build wheels and install them in the project environment.')
    parser.add_argument('--packages', nargs='*', default=[], help='Other installed packages to copy from this source environment.')
    args = parser.parse_args()
    if sys.version_info[:2] != (3, 12):
        raise RuntimeError('Run this script with the source Python 3.12 environment.')
    if not TARGET.is_file() or not UV.is_file():
        raise RuntimeError('The project environment or uv is missing.')
    if Path(sys.prefix).resolve() == TARGET.parents[1].resolve():
        raise RuntimeError('Run this script with the source environment, not the new environment.')
    roots = ['torch', 'numpy'] + args.packages
    distributions = packages(roots)
    torch = next(d for d in distributions if d.metadata['Name'].lower() == 'torch')
    if torch.version != '2.8.0+cu129':
        raise RuntimeError('Expected the existing CUDA package torch 2.8.0+cu129.')
    for dist in distributions:
        print(dist.metadata['Name'], dist.version, flush=True)
    if not args.install:
        print('Check complete. No files were copied or installed.')
        return
    result = subprocess.check_output([str(TARGET), '-B', '-c', 'import sys;print(f"{sys.version_info.major}.{sys.version_info.minor}")'], text=True).strip()
    if result != '3.12':
        raise RuntimeError('The target environment must use Python 3.12.')
    WHEELS.mkdir(exist_ok=True)
    for dist in distributions:
        build(dist)
    subprocess.run([str(UV), 'pip', 'install', '--python', str(TARGET), '--cache-dir', str(PROJECT / '.cache' / 'uv'), '--offline', '--no-index', '--find-links', str(WHEELS), '--link-mode', 'copy', *[name+'=='+metadata.version(name) for name in roots]], check=True)
    subprocess.run([str(UV), 'pip', 'check', '--python', str(TARGET)], check=True)
    subprocess.run([str(TARGET), '-B', '-c', 'import sys,torch;print("Python:",sys.executable);print("PyTorch:",torch.__version__);print("CUDA available:",torch.cuda.is_available());x=torch.ones((16,16),device="cuda");y=x@x;torch.cuda.synchronize();print("GPU:",torch.cuda.get_device_name(0));print("GPU test:",y.sum().item())'], check=True)


if __name__ == '__main__':
    main()

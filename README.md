# Persian STT Bench

Run local speech models, measure their outputs, and get a report through OpenRouter.
The command line runs the benchmark and report workflow. A local dashboard explores saved results and provides an optional OpenRouter assistant.

## Requirements

- Windows x64, Python 3.12, FFmpeg on PATH, and the model files.
- An NVIDIA GPU for the CUDA configuration. Vosk uses the CPU.
- The `whisper-server.exe` program and its matching DLL files for GGML models.
- An OpenRouter API key for the written summary and full report. Scoring needs no key.

The tested GPU package is PyTorch `2.8.0+cu129`. Other GPU builds are not verified.
Python packages are separate from model weights. The program does not download model weights.

## Install in a new environment

Use PowerShell in this folder. Use an installed Python 3.12 executable if `py` cannot find it.

```powershell
py -3.12 -m venv .venv
uv pip install --python .venv\Scripts\python.exe --index-url https://download.pytorch.org/whl/cu129 --extra-index-url https://pypi.org/simple --index-strategy unsafe-best-match "torch==2.8.0+cu129"
uv pip install --python .venv\Scripts\python.exe -r requirements.txt
```

The local setup used copies of installed packages to avoid another PyTorch download.
`tools/prepare_offline_torch.py` is an optional helper for that machine. It is not needed for a normal installation.
It reads the source environment, builds local wheels, and installs copies in this project's environment.
The helper does not modify the source packages. Local wheels and the environment are excluded from Git.

## Put files in place

Copy `configs/example.json` to `configs/local.json`. Set the model and executable paths.
Paths in the config are relative to this project folder, or they can be absolute.
Keep the native whisper.cpp DLL files beside its executable. You can point to an existing installation.

Put audio in `data/audio/`. Create `data/references.csv` for your recordings.
Each row must have a unique `id`, `file_name`, and a nonempty `reference`.
Audio paths are relative to the CSV file. Optional columns identify the category, speaker and prompt.
Review the text against what was spoken. Then set `references_confirmed` to `true`.
Do not use a tested model's output as the reference without a human review.
The repository does not include recordings, reference text, model outputs, or generated reports.

## Check and run

```powershell
.venv\Scripts\python.exe sttbench.py check --config configs/local.json
.venv\Scripts\python.exe sttbench.py run --config configs/local.json
```

Start with a small check if needed:

```powershell
.venv\Scripts\python.exe sttbench.py run --only-file sample-01 --repeats 1
```

Each run prints its output folder. The default is one warmup and three measured repetitions per file.
The reported time is the median. Models run in separate processes, one at a time.
Use `--model vosk` to run one configured model. Use `--resume results/RUN-ID` with the same selection,
references, packages, code and settings to reuse successful files. Changed inputs require a new run.

## Get the report

Copy `.env.example` to `.env` and enter your key. The default model is `deepseek/deepseek-v4-pro`.

```powershell
.venv\Scripts\python.exe sttbench.py report --run results/RUN-ID
```

All measured text results go to OpenRouter in one evidence package. Audio and weights are not sent.
The agent writes the short summary, report sections and tables. Measured fact placeholders keep numeric
values tied to the scoring output. Structural checks do not prove that every narrative conclusion is correct.
There is at most one retry for a failed report request. The STT evaluation is not repeated.

Open `index.html` in the result folder. It has the short summary and a **Download Full Report** button.
The complete `report.html` includes all measured tables, outputs, alignments and run details.
`report.md` contains the agent's written analysis. `per-file.csv`, `metrics.json` and `evidence.json` retain the measurements.
Without a key, use `numeric-report.html`. It is clearly marked as a numeric report without an LLM summary.

## What is measured

- Raw and normalized WER/CER. Corpus rates use summed error counts, not mean file percentages.
- Word substitutions, deletions and insertions; exact sentence match; completion rate; time and RTF.
- Per-file, category and speaker results. A common-file comparison is included when a model fails.
- Worker/child process RAM is sampled every 100 ms. PyTorch GPU allocation is reported for its adapter.
  These memory measurements are different; they are not a common GPU memory ranking.

Raw scoring collapses whitespace only. Normalization maps Arabic yeh/kaf and digit glyphs,
removes Arabic marks and tatweel, separates punctuation/symbols and ZWNJ/ZWJ, removes bidi controls,
and collapses whitespace. CER includes internal spaces. Both profiles are saved.
There is no number-word conversion, spelling correction, or colloquial rewrite.
Numbers, emails and bracket targets are metadata. No semantic entity score is claimed in this release.

Original audio is kept. Prepared audio is mono 16 kHz PCM16 WAV, without denoising, volume changes or silence trimming.
Native model files and saved generation settings are not changed. Transformers uses the saved weight dtype.
GGML models keep their existing file type. Persian transcription is selected for whisper.cpp.
For Transformers audio longer than thirty seconds, native timestamp decoding is enabled and recorded.
No prompt includes the reference transcript. Vosk uses no grammar supplied by this project.

RTF includes WAV read, features and decoding; whisper.cpp also includes local HTTP request time.
Load and warmup are separate. Engine, device and decoding differences are part of the measured system.
There is no automatic CPU or reduced-precision fallback after a memory error.

A small dataset cannot establish general Persian accuracy, speaker-group superiority, or statistical superiority.
No weighted composite score is used.

## Tests

```powershell
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

## Publication

Keep model licenses and dataset permissions with your release. Models, private recordings, secrets,
local paths, result folders and local environments are excluded from Git by default.
No repository or dataset is published automatically.

# Chat assistant robot

`robot-look-around.glb` is an original procedural model. It contains 15 rounded meshes, five materials, and a nine-second head rotation animation named `Look left and right`. A viewer must enable animation repeat to loop it. The file uses standard glTF 2.0 and has no external textures or dependencies.

The dashboard uses `RobotIcon.jsx` to draw the same design directly with WebGL. This avoids a model loader and a large 3D library for a small button. The component pauses when hidden and shows one static frame when reduced motion is enabled. A CSS robot is shown if WebGL cannot start.

The supplied image was a visual reference. No part of that image is embedded in the geometry or materials.

# De Rigger

The fashionable way to build your sim rig.

Check it out [here](https://derigger.glitch.me/)!

Change the comma separated values in the text area to modify the rig.  
Each row represents a part:  

Part, Assembly, x, y, z (scale), x, y, z (position), x, y, z (angle)

Currently available parts:  

"8040" - 8040 profile  
"4040" - 4040 profile  
"c8040" - 8040 angle  
"c4040" - 4040 angle  

Assemblies are a combination of parts that can also be used as a part.
Every part must be in an assembly. The top level or default assembly can be called anything e.g. "model".

Straight profile parts are set to 1mm depth. Scale the z axis to get the desired length.

Use a '#' at the start of the line to hide a part.
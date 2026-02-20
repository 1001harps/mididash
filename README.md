# mididash

Browser-based MIDI CC controller using the Web MIDI API.

## Features

- Multiple racks, each on an independent MIDI channel
- Virtual rotary knobs with mouse and touch control
- Configurable CC numbers (0-127) and labels per knob
- Per-rack channel selection (1-16) and send-all button
- Collapsible racks
- Add/remove racks and individual knobs
- MIDI output device selection
- Import/export configurations as JSON
- State persistence via localStorage

## JSON Schema

Configurations are stored and exported as an array of racks. Each rack maps to
one MIDI channel:

```json
[
  {
    "name": "Synth",
    "channel": 1,
    "controls": [
      { "cc": 14, "name": "Filter Cutoff" },
      { "cc": 15, "name": "Filter Resonance" }
    ]
  },
  {
    "name": "DrumSampler",
    "channel": 2,
    "controls": [
      { "cc": 14, "name": "Global Pitch" },
      { "cc": 15, "name": "Global Decay" }
    ]
  }
]
```

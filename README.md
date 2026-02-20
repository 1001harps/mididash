# mididash

Browser-based MIDI CC controller using the Web MIDI API.

## Features

- Virtual rotary knobs with mouse and touch control
- Configurable CC numbers (0-127) and labels per knob
- MIDI channel selection (1-16)
- MIDI output device selection
- Import/export bank configurations as JSON
- State persistence via localStorage

## Bank Schema

```json
{
  "name": "My Bank",
  "channel": 1,
  "controls": [
    { "cc": 1, "name": "Knob 1" },
    { "cc": 2, "name": "Knob 2" }
  ]
}
```

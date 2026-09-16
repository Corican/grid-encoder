Note: Just a concept I am playing with. AI coded. Don't expect much.

# Grid Encoder/Decoder

A minimal Single Page Application (SPA) that encodes/decodes a 9×10 clickable grid into a 30-digit fraction using BigInt arithmetic and SHA-256 based color palettes.

## Features

- **9×10 Clickable Grid**: Toggle cells on/off to create patterns
- **Grid Controls**: Clear, Fill, and Randomize buttons for quick grid manipulation
- **Live Preview**: 10×10 canvas showing the grid with color-coded palette
- **Encoding**: Convert grid patterns to 30-digit fractions (0.000000000000000000000000000000)
- **Decoding**: Convert 30-digit fractions back to grid patterns with visual preview
- **Decoder Canvas**: 10×10 image preview in decoder section showing decoded pattern
- **Nano Balance Decoder**: Decode images directly from Nano account balances
- **SHA-256 Palette**: Generate 12 unique colors from any address string
- **Copy Functionality**: Copy generated amounts to clipboard
- **Validation**: Ensure amounts are exactly 30 digits
- **Round-trip Testing**: Built-in test functionality to verify encoding/decoding

## How to Use

1. **Open** `index.html` in a web browser
2. **Enter an address** (or any string) in the "Address" field
3. **Create patterns** using:
   - **Click cells** in the 9×10 grid to toggle individual cells
   - **Clear button**: Set all 90 bits to 0
   - **Fill button**: Set all 90 bits to 1
   - **Randomize button**: Set each bit to 0/1 with 50% probability
4. **Click "Generate Amount"** to encode the grid into a 30-digit fraction
5. **Use "Copy Amount"** to copy the result to clipboard
6. **For decoding**: Enter a 30-digit amount and address, then click "Decode"
7. **View decoded image**: The decoder section shows a 10×10 canvas preview of the decoded pattern
8. **Nano balance decoding**: Enter a Nano address and click "Decode From Balance" to decode from account balance
9. **Test functionality**: Use "Test Round-Trip" to verify encoding/decoding works correctly

## Technical Details

### Encoding Process
1. Flatten 9×10 grid row-major (top→bottom, left→right) into 90 bits
2. Build BigInt: `value = (value<<1n) | BigInt(bit)` for each bit
3. Convert to base-10 string and zero-pad to 30 digits
4. Format as `0.` + 30 digits

### Decoding Process
1. Validate format: `^0\.\d{30}$`
2. Extract 30 digits and convert to BigInt
3. Convert to binary string padded to 90 bits
4. Map back to 9×10 boolean array

### Color Palette
- Generate SHA-256 hash of address string
- Create 12 RGB colors from hash bytes
- Colors 0-1: Grid data (0/1 states)
- Colors 2-11: Marker column (rows 0-9)

### Nano Balance Integration
- Fetches account balance via Nano RPC (account_info)
- Converts raw balance to 30-digit fraction format
- Handles both small (< 1 Nano) and large (≥ 1 Nano) balances
- For large balances: uses only the last 30 decimal digits (mod 10^30)
- Uses same decoding logic as manual amount input
- RPC endpoint: https://node.somenano.com/proxy (configurable)

## Files

- `index.html` - Main HTML structure
- `style.css` - Styling and layout
- `app.js` - Core application logic

## Browser Requirements

- Modern browser with BigInt support
- Web Crypto API support (for SHA-256)
- Canvas API support

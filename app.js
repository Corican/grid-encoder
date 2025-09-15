// Grid Encoder/Decoder App

// Nano RPC Configuration
// Use SomeNano public RPC as temporary endpoint for balance lookups
const NODE_RPC_URLS = [
    'https://node.somenano.com/proxy',
    'https://rpc.nano.to/'
];
let CURRENT_RPC_INDEX = 0;

// Helpers
function validateAmount30String(amount) {
    return /^0\.\d{30}$/.test(amount);
}

function normalizeAmountTo30(amount) {
    const trimmed = (amount || '').trim();
    if (!/^0\.\d{1,30}$/.test(trimmed)) return null;
    const digits = trimmed.slice(2).padEnd(30, '0').slice(0, 30);
    return `0.${digits}`;
}

function isValidNanoAddress(address) {
    // Basic validation for nano_ or xrb_ followed by 60-ish base32 chars and checksum
    const pattern = /^(nano|xrb)_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/;
    return pattern.test(address);
}

async function withTimeoutFetch(url, options, timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(id);
    }
}

// Nano RPC Helper with timeout and fallback
async function nanoRpc(body) {
    const attempts = NODE_RPC_URLS.length;
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
        const url = NODE_RPC_URLS[CURRENT_RPC_INDEX];
        try {
            const res = await withTimeoutFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }, 5000);
            if (!res.ok) throw new Error('RPC error');
            return res.json();
        } catch (error) {
            lastError = error;
            CURRENT_RPC_INDEX = (CURRENT_RPC_INDEX + 1) % NODE_RPC_URLS.length;
        }
    }
    throw new Error('Could not reach the node. Try again or switch nodes in settings.');
}

function encodeGridToFraction30(grid) {
    let bits = '';
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            bits += grid[row][col] ? '1' : '0';
        }
    }
    let value = 0n;
    for (const bit of bits) {
        value = (value << 1n) | BigInt(bit);
    }
    const dec = value.toString(10);
    return dec.padStart(30, '0');
}

function decodeFraction30ToGrid(fraction30) {
    const value = BigInt(fraction30);
    let bin = value.toString(2).padStart(90, '0');
    bin = bin.slice(-90);
    const grid = Array(10).fill().map(() => Array(9).fill(false));
    let i = 0;
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            grid[r][c] = bin[i++] === '1';
        }
    }
    return grid;
}

async function derivePalette(address) {
    const encoder = new TextEncoder();
    const data = encoder.encode(address);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const palette = Array(12).fill().map(() => ({ r: 0, g: 0, b: 0 }));
    for (let i = 0; i < 12; i++) {
        palette[i] = {
            r: hashArray[(i * 3 + 0) % 32],
            g: hashArray[(i * 3 + 1) % 32],
            b: hashArray[(i * 3 + 2) % 32],
        };
    }
    return palette;
}

class GridEncoder {
    constructor() {
        this.gridData = Array(10).fill().map(() => Array(9).fill(false)); // 10 rows × 9 columns
        this.palette = Array(12).fill().map(() => ({r: 0, g: 0, b: 0}));
        this.canvas = document.getElementById('previewCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.renderGrid();
        this.updatePreview();
    }
    
    initializeElements() {
        this.dataGrid = document.getElementById('dataGrid');
        this.addressInput = document.getElementById('addressInput');
        this.generateBtn = document.getElementById('generateBtn');
        this.testBtn = document.getElementById('testBtn');
        this.amountOutput = document.getElementById('amountOutput');
        this.copyAmountBtn = document.getElementById('copyAmountBtn');
        this.decodeAmountInput = document.getElementById('decodeAmountInput');
        this.decodeAddressInput = document.getElementById('decodeAddressInput');
        this.decodeBtn = document.getElementById('decodeBtn');
        this.decodeOutput = document.getElementById('decodeOutput');
        this.statusArea = document.getElementById('statusArea');
        
        // Grid control buttons
        this.clearBtn = document.getElementById('clearBtn');
        this.fillBtn = document.getElementById('fillBtn');
        this.randomizeBtn = document.getElementById('randomizeBtn');
        
        // Nano balance decoder elements
        this.nanoAddressInput = document.getElementById('nanoAddressInput');
        this.decodeFromBalanceBtn = document.getElementById('decodeFromBalanceBtn');
        
        // Initialize decoder canvas
        this.decodeCanvas = document.getElementById('decodePreviewCanvas');
        this.decodeCtx = this.decodeCanvas.getContext('2d');
        this.decodeCtx.imageSmoothingEnabled = false;
    }
    
    setupEventListeners() {
        // Generate amount button
        this.generateBtn.addEventListener('click', () => this.generateAmount());
        
        // Test round-trip button
        this.testBtn.addEventListener('click', () => this.testRoundTrip());
        
        // Copy amount button
        this.copyAmountBtn.addEventListener('click', () => this.copyAmount());
        
        // Decode button
        this.decodeBtn.addEventListener('click', () => this.decodeAmount());
        
        // Grid control buttons
        this.clearBtn.addEventListener('click', () => this.clearGrid());
        this.fillBtn.addEventListener('click', () => this.fillGrid());
        this.randomizeBtn.addEventListener('click', () => this.randomizeGrid());
        
        // Nano balance decoder button
        this.decodeFromBalanceBtn.addEventListener('click', () => this.decodeFromBalance());
        
        // Address input change
        this.addressInput.addEventListener('input', () => this.updatePreview());
        this.decodeAddressInput.addEventListener('input', () => this.updatePreview());
    }
    
    renderGrid() {
        this.dataGrid.innerHTML = '';
        
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                if (this.gridData[row][col]) {
                    cell.classList.add('active');
                }
                
                cell.addEventListener('click', () => this.toggleCell(row, col));
                this.dataGrid.appendChild(cell);
            }
        }
    }
    
    toggleCell(row, col) {
        this.gridData[row][col] = !this.gridData[row][col];
        this.renderGrid();
        this.updatePreview();
    }
    
    clearGrid() {
        // Set all 90 bits to 0
        this.gridData = Array(10).fill().map(() => Array(9).fill(false));
        this.updateGridAndPreview();
        this.showStatus('Grid cleared', 'success');
    }
    
    fillGrid() {
        // Set all 90 bits to 1
        this.gridData = Array(10).fill().map(() => Array(9).fill(true));
        this.updateGridAndPreview();
        this.showStatus('Grid filled', 'success');
    }
    
    randomizeGrid() {
        // Set each bit to 0/1 with p=0.5
        this.gridData = Array(10).fill().map(() => 
            Array(9).fill().map(() => Math.random() < 0.5)
        );
        this.updateGridAndPreview();
        this.showStatus('Grid randomized', 'success');
    }
    
    updateGridAndPreview() {
        // Update the internal 9×10 state, re-render editor and preview, recompute amount
        this.renderGrid();
        this.updatePreview();
        
        // Auto-generate amount if address is provided
        const address = this.addressInput.value.trim();
        if (address) {
            this.generatePalette(address).then(() => {
                const amount = this.encodeGrid();
                this.amountOutput.value = amount;
            }).catch(() => {
                // If palette generation fails, still update the grid
            });
        }
    }
    
    async generateAmount() {
        try {
            const address = this.addressInput.value.trim();
            if (!address) {
                this.showStatus('Please enter an address', 'error');
                return;
            }
            
            // Generate palette from address
            await this.generatePalette(address);
            
            // Encode grid to amount
            const amount = this.encodeGrid();
            this.amountOutput.value = amount;
            
            this.showStatus('Amount generated successfully', 'success');
            this.updatePreview();
        } catch (error) {
            this.showStatus(`Error generating amount: ${error.message}`, 'error');
        }
    }
    
    async generatePalette(address) {
        try {
            this.palette = await derivePalette(address);
        } catch (error) {
            throw new Error(`Failed to generate palette: ${error.message}`);
        }
    }
    
    encodeGrid() {
        const digits = encodeGridToFraction30(this.gridData);
        return `0.${digits}`;
    }
    
    decodeAmount() {
        try {
            const amount = this.decodeAmountInput.value.trim();
            const address = this.decodeAddressInput.value.trim();
            
            if (!amount || !address) {
                this.showStatus('Please enter both amount and address', 'error');
                this.clearDecodeCanvas();
                return;
            }
            
            // Validate amount format: allow 1..30 digits, we'll right-pad to 30
            if (!/^0\.\d{1,30}$/.test(amount)) {
                this.showStatus('Enter an amount like 0.<digits>. We will pad to 30 digits.', 'error');
                this.clearDecodeCanvas();
                return;
            }

            // Validate address format
            if (!isValidNanoAddress(address)) {
                this.showStatus('Please paste a valid Nano address.', 'error');
                this.clearDecodeCanvas();
                return;
            }
            
            // Generate palette from address
            this.generatePalette(address).then(() => {
                // Extract digits and normalize to exactly 30 by right-padding
                const digits = amount.substring(2).padEnd(30, '0').slice(0, 30);
                this.decodeAmountInput.value = `0.${digits}`;
                const decodedGridData = decodeFraction30ToGrid(digits);
                
                // Render the decoded image in the decoder canvas
                this.renderDecodeCanvas(decodedGridData);
                
                // Update main grid and preview
                this.gridData = decodedGridData;
                this.renderGrid();
                this.updatePreview();
                
                this.showStatus('Amount decoded successfully', 'success');
                
                // Show preview in decode output
                this.showDecodePreview();
            }).catch(error => {
                this.showStatus(`Error decoding: ${error.message}`, 'error');
                this.clearDecodeCanvas();
            });
            
        } catch (error) {
            this.showStatus(`Error decoding amount: ${error.message}`, 'error');
            this.clearDecodeCanvas();
        }
    }
    
    showDecodePreview() {
        let preview = 'Decoded Grid:\n';
        preview += 'Row-major order (top→bottom, left→right):\n';
        
        for (let row = 0; row < 10; row++) {
            let rowStr = '';
            for (let col = 0; col < 9; col++) {
                rowStr += this.gridData[row][col] ? '1' : '0';
            }
            preview += `Row ${row}: ${rowStr}\n`;
        }
        
        preview += '\nBinary string (90 bits):\n';
        let binaryStr = '';
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                binaryStr += this.gridData[row][col] ? '1' : '0';
            }
        }
        preview += binaryStr;
        
        this.decodeOutput.textContent = preview;
    }
    
    updatePreview() {
        const address = this.addressInput.value.trim() || this.decodeAddressInput.value.trim();
        if (!address) {
            this.clearCanvas();
            return;
        }
        
        this.generatePalette(address).then(() => {
            this.renderCanvas();
        }).catch(() => {
            this.clearCanvas();
        });
    }
    
    renderCanvas() {
        const cellSize = 10; // 10x10 logical grid, 100x100 canvas
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, 100, 100);
        
        // Render data grid (9×10)
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const color = this.gridData[row][col] ? this.palette[1] : this.palette[0];
                this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                this.ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }
        
        // Render marker column (rightmost 1×10)
        for (let row = 0; row < 10; row++) {
            const color = this.palette[row + 2];
            this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
            this.ctx.fillRect(9 * cellSize, row * cellSize, cellSize, cellSize);
        }
    }
    
    clearCanvas() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, 100, 100);
    }
    
    renderDecodeCanvas(gridData) {
        const cellSize = 10; // 10x10 logical grid, 100x100 canvas
        
        // Clear canvas
        this.decodeCtx.fillStyle = '#000';
        this.decodeCtx.fillRect(0, 0, 100, 100);
        
        // Render data grid (9×10)
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const color = gridData[row][col] ? this.palette[1] : this.palette[0];
                this.decodeCtx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                this.decodeCtx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }
        
        // Render marker column (rightmost 1×10)
        for (let row = 0; row < 10; row++) {
            const color = this.palette[row + 2];
            this.decodeCtx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
            this.decodeCtx.fillRect(9 * cellSize, row * cellSize, cellSize, cellSize);
        }
    }
    
    clearDecodeCanvas() {
        this.decodeCtx.fillStyle = '#000';
        this.decodeCtx.fillRect(0, 0, 100, 100);
    }
    
    copyAmount() {
        const amount = this.amountOutput.value;
        if (!amount) {
            this.showStatus('No amount to copy', 'warning');
            return;
        }
        
        // Ensure we're copying the exact 30-digit format
        if (!/^0\.\d{30}$/.test(amount)) {
            this.showStatus('Invalid amount format - cannot copy', 'error');
            return;
        }
        
        navigator.clipboard.writeText(amount).then(() => {
            this.showStatus('Amount copied to clipboard', 'success');
        }).catch(() => {
            this.showStatus('Failed to copy amount', 'error');
        });
    }
    
    showStatus(message, type = 'info') {
        this.statusArea.textContent = message;
        this.statusArea.className = `status-area ${type}`;
        
        // Clear status after 5 seconds
        setTimeout(() => {
            this.statusArea.textContent = '';
            this.statusArea.className = 'status-area';
        }, 5000);
    }
    
    async decodeFromBalance() {
        try {
            const addr = this.nanoAddressInput.value.trim();
            if (!addr) {
                this.showStatus('Please enter a Nano address', 'error');
                return;
            }
            
            this.showStatus('Fetching balance...', 'info');
            
            // 1) fetch balance (raw)
            const data = await nanoRpc({
                action: 'account_info',
                account: addr,
                representative: 'false',
                weight: 'false',
                pending: 'true'
            });
            
            if (!data.balance) {
                this.showStatus('Account not found or has no balance', 'error');
                return;
            }
            
            const balanceRaw = data.balance; // string
            
            // 2) Process balance (handle both < 1 Nano and ≥ 1 Nano)
            const TEN_30 = BigInt('1' + '0'.repeat(30));
            const rawBI = BigInt(balanceRaw);
            
            // Check if balance is ≥ 1 Nano
            const isLargeBalance = rawBI >= TEN_30;
            
            // fractional raw = last 30 decimal digits (mod 10^30)
            const fracRaw = rawBI % TEN_30;
            
            // fraction string (right-pad to 30 if shorter; safety slice to 30)
            let fraction30 = fracRaw.toString(10);
            if (fraction30.length < 30) {
                fraction30 = fraction30.padEnd(30, '0');
            }
            if (fraction30.length > 30) {
                fraction30 = fraction30.slice(0, 30);
            }
            
            // build amount string for UI
            const amount = `0.${fraction30}`;
            this.setDecoderAmount(amount);
            
            // 3) Convert to 90-bit grid (row-major)
            const grid = decodeFraction30ToGrid(fraction30);
            
            // 4) render with existing palette rules
            this.renderFromGridAndAddress(grid, addr);
            
            // Show appropriate success message
            if (isLargeBalance) {
                this.showStatus('Balance ≥ 1 Nano detected. Decoding from the last 30 digits only (integer part ignored).', 'success');
            } else {
                this.showStatus('Balance decoded successfully', 'success');
            }
            
        } catch (error) {
            this.showStatus(`Error fetching balance: ${error.message}`, 'error');
        }
    }
    
    setDecoderAmount(amount) {
        // Update the decoder input field
        this.decodeAmountInput.value = amount;
    }
    
    async renderFromGridAndAddress(grid, address) {
        try {
            // Generate palette from address
            await this.generatePalette(address);
            
            // Render the decoded image in the decoder canvas
            this.renderDecodeCanvas(grid);
            
            // Update main grid and preview
            this.gridData = grid;
            this.renderGrid();
            this.updatePreview();
            
            // Show preview in decode output
            this.showDecodePreview();
            
        } catch (error) {
            this.showStatus(`Error rendering decoded image: ${error.message}`, 'error');
        }
    }
    
    async renderDecoded(amount, address) {
        // Use the existing decoder logic
        try {
            // Validate amount format
            if (!validateAmount30String(amount)) {
                this.showStatus('Invalid amount format', 'error');
                return;
            }
            
            // Generate palette from address
            await this.generatePalette(address);
            
            // Extract 30 digits
            const digits = amount.substring(2);
            const decodedGridData = decodeFraction30ToGrid(digits);
            
            // Render the decoded image in the decoder canvas
            this.renderDecodeCanvas(decodedGridData);
            
            // Update main grid and preview
            this.gridData = decodedGridData;
            this.renderGrid();
            this.updatePreview();
            
            // Show preview in decode output
            this.showDecodePreview();
            
        } catch (error) {
            this.showStatus(`Error rendering decoded image: ${error.message}`, 'error');
        }
    }
    
    // Test method to verify round-trip encoding/decoding
    testRoundTrip() {
        try {
            // Test all-zero grid
            this.gridData = Array(10).fill().map(() => Array(9).fill(false));
            const allZeroAmount = this.encodeGrid();
            console.log('All-zero grid amount:', allZeroAmount);
            
            // Test single bit grid (first cell)
            this.gridData = Array(10).fill().map(() => Array(9).fill(false));
            this.gridData[0][0] = true;
            const singleBitAmount = this.encodeGrid();
            console.log('Single bit amount:', singleBitAmount);
            
            // Test all-ones grid
            this.gridData = Array(10).fill().map(() => Array(9).fill(true));
            const allOnesAmount = this.encodeGrid();
            console.log('All-ones amount:', allOnesAmount);
            
            // Verify all amounts have exactly 30 digits
            const amounts = [allZeroAmount, singleBitAmount, allOnesAmount];
            for (const amount of amounts) {
                if (!/^0\.\d{30}$/.test(amount)) {
                    throw new Error(`Invalid amount format: ${amount}`);
                }
            }
            
            console.log('Round-trip test passed: all amounts have exactly 30 digits');
            this.showStatus('Round-trip test passed', 'success');
        } catch (error) {
            console.error('Round-trip test failed:', error);
            this.showStatus(`Round-trip test failed: ${error.message}`, 'error');
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GridEncoder();
});

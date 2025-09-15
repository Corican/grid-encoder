// Test script to verify grid control buttons functionality
function testGridControls() {
    console.log('Testing Grid Control Buttons...');
    
    // Test Clear functionality
    console.log('\n=== Testing Clear ===');
    const clearGrid = Array(10).fill().map(() => Array(9).fill(false));
    const clearAmount = encodeGrid(clearGrid);
    console.log('Clear amount:', clearAmount);
    console.log('Expected: 0.000000000000000000000000000000');
    console.log('Match:', clearAmount === '0.000000000000000000000000000000');
    
    // Test Fill functionality
    console.log('\n=== Testing Fill ===');
    const fillGrid = Array(10).fill().map(() => Array(9).fill(true));
    const fillAmount = encodeGrid(fillGrid);
    console.log('Fill amount:', fillAmount);
    console.log('Format check:', /^0\.\d{30}$/.test(fillAmount));
    
    // Test Randomize functionality
    console.log('\n=== Testing Randomize ===');
    const randomGrid = Array(10).fill().map(() => 
        Array(9).fill().map(() => Math.random() < 0.5)
    );
    const randomAmount = encodeGrid(randomGrid);
    console.log('Random amount:', randomAmount);
    console.log('Format check:', /^0\.\d{30}$/.test(randomAmount));
    
    // Test round-trip for all
    console.log('\n=== Testing Round-trip ===');
    const testGrids = [clearGrid, fillGrid, randomGrid];
    const testAmounts = [clearAmount, fillAmount, randomAmount];
    
    for (let i = 0; i < testGrids.length; i++) {
        const original = testGrids[i];
        const amount = testAmounts[i];
        const decoded = decodeAmount(amount);
        const matches = JSON.stringify(original) === JSON.stringify(decoded);
        console.log(`Round-trip ${i + 1}: ${matches ? 'PASS' : 'FAIL'}`);
    }
    
    console.log('\nAll tests completed!');
}

function encodeGrid(gridData) {
    let bits = '';
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            bits += gridData[row][col] ? '1' : '0';
        }
    }
    
    let value = 0n;
    for (const bit of bits) {
        value = (value << 1n) | BigInt(bit);
    }
    
    const dec = value.toString(10);
    const digits = dec.padStart(30, '0');
    
    return `0.${digits}`;
}

function decodeAmount(amount) {
    if (!/^0\.\d{30}$/.test(amount)) {
        return null;
    }
    
    const digits = amount.substring(2);
    const value = BigInt(digits);
    const bin = value.toString(2).padStart(90, '0');
    
    const gridData = Array(10).fill().map(() => Array(9).fill(false));
    let bitIndex = 0;
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            gridData[row][col] = bin[bitIndex] === '1';
            bitIndex++;
        }
    }
    
    return gridData;
}

// Run tests
testGridControls();

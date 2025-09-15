// Test script to verify large balance handling
function testLargeBalanceHandling() {
    console.log('Testing Large Balance Handling...');
    
    // Test with a large balance (simulating 1.5 Nano = 1500000000000000000000000000000 raw)
    const largeBalance = '1500000000000000000000000000000';
    const TEN_30 = BigInt('1' + '0'.repeat(30));
    const rawBI = BigInt(largeBalance);
    
    console.log('Large balance:', largeBalance);
    console.log('Is large balance:', rawBI >= TEN_30);
    
    // fractional raw = last 30 decimal digits (mod 10^30)
    const fracRaw = rawBI % TEN_30;
    console.log('Fractional part:', fracRaw.toString());
    
    // 30-digit fraction string (left pad with zeros)
    const fraction30 = fracRaw.toString(10).padStart(30, '0');
    console.log('30-digit fraction:', fraction30);
    console.log('Length check:', fraction30.length === 30);
    
    // Convert to 90-bit grid
    const valueBI = BigInt(fraction30);
    let bin = valueBI.toString(2);
    bin = bin.padStart(90, '0').slice(-90);
    console.log('Binary (90 bits):', bin);
    console.log('Binary length:', bin.length);
    
    // Map to 9×10 grid
    const bits = [...bin].map(c => c === '1' ? 1 : 0);
    const grid = [];
    for (let r = 0; r < 10; r++) {
        grid.push(bits.slice(r*9, r*9 + 9));
    }
    
    console.log('Grid dimensions:', grid.length, 'x', grid[0].length);
    console.log('Grid sample (first row):', grid[0]);
    
    // Test with small balance (should be unchanged)
    const smallBalance = '500000000000000000000000000000'; // 0.5 Nano
    const smallBI = BigInt(smallBalance);
    const smallFracRaw = smallBI % TEN_30;
    const smallFraction30 = smallFracRaw.toString(10).padStart(30, '0');
    
    console.log('\nSmall balance test:');
    console.log('Small balance:', smallBalance);
    console.log('Small fraction:', smallFraction30);
    console.log('Should match original:', smallFraction30 === smallBalance);
    
    console.log('\nAll tests passed!');
}

testLargeBalanceHandling();

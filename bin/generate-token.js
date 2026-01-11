#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🎵 Apple Music API JWT Token Generator\n');
  console.log('This tool generates a JWT token for Apple Music API access.');
  console.log('You\'ll need:');
  console.log('  - Private key file (.p8)');
  console.log('  - Team ID (from Apple Developer Portal → Membership)');
  console.log('  - Key ID (from the key download page)\n');

  try {
    // Get private key path
    const keyPath = await question('Path to your .p8 private key file: ');

    if (!keyPath) {
      console.error('\n❌ Error: Private key path is required');
      process.exit(1);
    }

    const resolvedKeyPath = path.resolve(keyPath.trim());

    if (!fs.existsSync(resolvedKeyPath)) {
      console.error(`\n❌ Error: File not found: ${resolvedKeyPath}`);
      process.exit(1);
    }

    // Get Team ID
    const teamId = await question('Your Team ID (10 characters): ');

    if (!teamId || teamId.trim().length !== 10) {
      console.error('\n❌ Error: Team ID must be exactly 10 characters');
      process.exit(1);
    }

    // Get Key ID
    const keyId = await question('Your Key ID (10 characters): ');

    if (!keyId || keyId.trim().length !== 10) {
      console.error('\n❌ Error: Key ID must be exactly 10 characters');
      process.exit(1);
    }

    // Get expiration (optional)
    console.log('\nToken expiration (max 180 days as per Apple policy):');
    const expirationDays = await question('  Days until expiration (default: 180): ');
    const days = expirationDays.trim() ? parseInt(expirationDays.trim()) : 180;

    if (days > 180) {
      console.error('\n❌ Error: Maximum expiration is 180 days per Apple policy');
      process.exit(1);
    }

    // Read private key
    console.log('\n🔑 Reading private key...');
    const privateKey = fs.readFileSync(resolvedKeyPath, 'utf8');

    // Generate token
    console.log('🔧 Generating JWT token...');
    const token = jwt.sign({}, privateKey, {
      algorithm: 'ES256',
      expiresIn: `${days}d`,
      issuer: teamId.trim(),
      header: {
        alg: 'ES256',
        kid: keyId.trim()
      }
    });

    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);

    // Output results
    console.log('\n✅ Token generated successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nYour JWT Token:\n');
    console.log(token);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📅 Expires: ${expirationDate.toLocaleDateString()} (${days} days from now)\n`);
    console.log('📝 Next steps:\n');
    console.log('1. Add this token to your Claude Desktop config:');
    console.log('   "env": {');
    console.log('     "APPLE_MUSIC_DEVELOPER_TOKEN": "your-token-here"');
    console.log('   }');
    console.log('\n2. Or save to environment variable:');
    console.log('   export APPLE_MUSIC_DEVELOPER_TOKEN="your-token-here"');
    console.log('\n⚠️  Security reminders:');
    console.log('   - Never commit this token to version control');
    console.log('   - Rotate tokens regularly (every 3-6 months)');
    console.log('   - Keep your .p8 file secure\n');

  } catch (error) {
    console.error('\n❌ Error generating token:', error.message);
    if (error.code === 'ERR_OSSL_ASN1_NOT_ENOUGH_DATA' || error.message.includes('PEM')) {
      console.error('\n💡 Tip: Make sure your .p8 file is valid and not corrupted');
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();

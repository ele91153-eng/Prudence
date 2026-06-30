import webpush from 'web-push';
const keys = webpush.generateVAPIDKeys();
console.log('\nAdd these to your Render environment variables:\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('\nKeep the private key secret!\n');

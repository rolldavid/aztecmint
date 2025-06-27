const { NFTStorage } = require('nft.storage');

const NFT_STORAGE_TOKEN = "4f5f0ef780f94b4ba72fdbb511200c0c";

async function testNFTStorage() {
  try {
    console.log('Testing NFT.Storage connection...');
    const client = new NFTStorage({ token: NFT_STORAGE_TOKEN });
    
    // Test with a simple text blob
    const testBlob = new Blob(['Hello World'], { type: 'text/plain' });
    const cid = await client.storeBlob(testBlob);
    
    console.log('✅ NFT.Storage connection successful!');
    console.log('Test CID:', cid);
    console.log('Test URL:', `https://ipfs.io/ipfs/${cid}`);
  } catch (error) {
    console.error('❌ NFT.Storage connection failed:');
    console.error(error.message);
    console.error('Full error:', error);
  }
}

testNFTStorage(); 
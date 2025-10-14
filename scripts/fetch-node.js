import fetch from 'node-fetch';
import fs from 'fs';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_ID = 'zksBuILVajtp60Oca28Vnl';
const NODE_ID = process.argv[2] || '301:3861';

async function getNodeDetails() {
  console.log(`Fetching node details for ${NODE_ID}...`);
  
  const res = await fetch(`https://api.figma.com/v1/files/${FILE_ID}/nodes?ids=${NODE_ID}`, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN },
  });
  
  if (!res.ok) {
    throw new Error(`Figma API error: ${res.status} ${res.statusText}`);
  }
  
  const data = await res.json();
  
  // Save to file
  fs.writeFileSync('./figma-node-data.json', JSON.stringify(data, null, 2));
  console.log('✅ Node data saved to figma-node-data.json');
  
  // Print summary
  const node = data.nodes[NODE_ID];
  if (node && node.document) {
    const doc = node.document;
    console.log('\n📋 Node Summary:');
    console.log(`  Name: ${doc.name}`);
    console.log(`  Type: ${doc.type}`);
    console.log(`  Dimensions: ${doc.absoluteBoundingBox?.width || 0}x${doc.absoluteBoundingBox?.height || 0}`);
    console.log(`  Children: ${doc.children?.length || 0}`);
  }
  
  return data;
}

getNodeDetails().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});


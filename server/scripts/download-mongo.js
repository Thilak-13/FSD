const { MongoBinary } = require('mongodb-memory-server-core');

async function main() {
  console.log('Downloading MongoDB binary for in-memory testing...');
  const binPath = await MongoBinary.getPath({});
  console.log('MongoDB binary ready at:', binPath);
}

main().catch((err) => {
  console.error('Download failed:', err);
  process.exit(1);
});

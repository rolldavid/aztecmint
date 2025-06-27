const hre = require("hardhat");

async function main() {
  const UniqueImageNFT = await hre.ethers.getContractFactory("UniqueImageNFT");
  const contract = await UniqueImageNFT.deploy();
  await contract.waitForDeployment();
  console.log("Deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 
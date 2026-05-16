import { network } from "hardhat";

async function main() {
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();

  if (!deployer) {
    throw new Error("No deployer wallet found. Set DEPLOYER_PRIVATE_KEY before deploying.");
  }

  console.log(`Deploying CrankFoodie with ${deployer.account.address}`);

  const crankFoodie = await viem.deployContract("CrankFoodie");
  console.log(`CrankFoodie deployed to ${crankFoodie.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

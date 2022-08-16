// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { upgrades, ethers } = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  /// ================ Deploy Proxy ==========================
  // We get the contract to deploy
  const tokenAddress = '0x2507E77133A8D3923299fb79623Cebe7d26b100A';
  const vestingDistributionAddress = '0xd6F8595B0a1808dA9b529Da525F1101716618D1A';
  const VESTING = await hre.ethers.getContractFactory("Vesting");
  const vesting = await upgrades.deployProxy(VESTING, [tokenAddress, vestingDistributionAddress], {initializer: 'initialize'});
  // const vesting = await VESTING.deploy(tokenAddress, vestingDistributionAddress);

  await vesting.deployed();

  console.log("VESTING PORTAL PROXY deployed at: ", vesting.address);
  /// ================ Deploy Proxy ==========================

  // /// ================ UPGRADE ==========================
  // const treasuryProxyAddress = "0x5173cce22A2fbCF0f8324B96C0651e369450474D"
  // const Treasury = await ethers.getContractFactory("TreasuryV2");
  // const treasury = await upgrades.upgradeProxy(treasuryProxyAddress, Treasury);

  // console.log("treasury upgraded: ", treasury.address);
  // /// ================ UPGRADE ==========================


  // await hre.run("verify:verify", {
  //   address: greeter.address,
  //   constructorArguments: [tokenAddress, vestingDistributionAddress],
  // });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


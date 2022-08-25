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
  // const vestingDistributionAddress = '0xd6F8595B0a1808dA9b529Da525F1101716618D1A';

  const vestingDistributionAddress = [
    '0xd6F8595B0a1808dA9b529Da525F1101716618D1A',
    '0xd70C789cd4f04BbEc138eFcf2e3A0B076A6ca09c',
    '0x37a78aFb4Dc450752Ec5DbfD0ae015060DEB5D44',
    '0x20E31b0DdFAe840B22Dd3979F9582D7dc0FF97f0',
    '0x347e41C39dd10c4c7869097b441a38D1Cc0149A3',
    '0x5B83EB2F9F9a003Ccd71C01D9bD5ea86bB963fD3',
    '0x50778d11E1b2fF2D54c7A9b1e5FdadD6b1487637',
    '0x9e6397cEE6646eC1278Df490F235AC54a9F6C78F',
    '0x59066C7B22da34FFB58C4ea25855C09D7113e704',
    '0x20C2de4693A2FD30a8f30ef3c285BAeF60a2F965',
    '0x99DC161e816d0EEB1c74e9EE90FCa4D3B92117f0',
    '0xEe6A279B24Dd74322E3A86DE343141e3EefB3aad',
    '0x7F8ABD6eeE305FF803e9dFbB0016D224F25912B3',
    '0x951fF9b6F74d971C7C6737ee83493558dF210d5d',
    '0x6C04016047310c87A72F8B595580cDE3AB5d1144'
  ]

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


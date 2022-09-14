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
    '0x82b62b49823799DFb801691bFc7707Ff7625377e',
    '0xeE4371E78bA306d14581efCDC40479f1796735CC',
    '0x3dB4ED769f35fd694e5DE2A8b3bb79477dC7876B',
    '0xeA52Be1BB4174209C7820C597Bc19151B70b5047',
    '0xdBcee4D1548df8D1ba6D3E9Ce2B83c103441FEAa',
    '0x4B1f89390D711d8B7452d2cAcEa696F5b159d45b',
    '0x870B909A579914190C3222CB1136dBD9D19d145b',
    '0xc12069A488d8653C865E6A523bbDBb4AFa0F59dF',
    '0x720F0Ee2F58c99Abe91e08172e8C68401Cd0201c',
    '0x9A2d9Cd3B7D14cA40198C33216Dc827145C270E7',
    '0xEc4F5cdE80Eba95dAdCC0125ab8aB82928BE0282',
    '0xe56f65F3Cb896048A5736Ad8EC29909FB3E43232',
    '0x8C003d32db396AF67222D8BF8AAe394910BAb9aE',
    '0x59bC8B84A7298299F94f101606197D9b4935cdaD',
    '0xeB7Fca9fBc93170aE435ec0540598b738707d6Ce'
  ]


  const ONE_DAY = 24 * 60 * 60;

  const VESTING = await hre.ethers.getContractFactory("Vesting");
  const vesting = await upgrades.deployProxy(VESTING, [tokenAddress, ONE_DAY, vestingDistributionAddress], {initializer: 'initialize'});
  // const vesting = await VESTING.deploy();

  await vesting.deployed();

  console.log("VESTING PORTAL PROXY deployed at: ", vesting.address);

  // await vesting.initialize(tokenAddress, ONE_DAY, vestingDistributionAddress);
  /// ================ Deploy Proxy ==========================

  /// ================ UPGRADE ==========================
  // const ProxyAddress = "0x8123Bfa60cC3ae34Ea7c000dCE0B429D8Edd7F93"
  // const Treasury = await ethers.getContractFactory("Vesting_V2");
  // const treasury = await upgrades.upgradeProxy(ProxyAddress, Treasury);

  // console.log("Vesting upgraded: ", treasury.address);
  /// ================ UPGRADE ==========================


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


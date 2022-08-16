const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { keccak256 } = require("ethers/lib/utils");
const { ethers } = require("hardhat");
const { constants, balance } = require("@openzeppelin/test-helpers");
const { BigNumber } =  require("ethers");
const { tracker } = require("@openzeppelin/test-helpers/src/balance");
const { MerkleTree } = require("merkletreejs");


function expandTo18Decimals(n) {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18));
}

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployVesting() {
    const [owner, vestingDistributionAddress, wallet_1, wallet_2, wallet_3, wallet_4] = await ethers.getSigners();

    
    const TOKEN = await ethers.getContractFactory("Token");
    const token = await TOKEN.deploy("TOKEN A", "TOKEN A");

    const VESTING = await ethers.getContractFactory("Vesting");
    const vesting = await VESTING.deploy(token.address, vestingDistributionAddress.address);

    buyVesting = [
      {
        candidate: wallet_1.address,
        allocationType: 0,
        totalVestingAmount: 100,
        TGE: 100,
        start: Math.floor(new Date().getTime() / 1000),
        cliffDuration: 86400,
        vestingDuration: 864000,
      },
      {
        candidate: wallet_2.address,
        allocationType: 1,
        totalVestingAmount: 100,
        TGE: 100,
        start: Math.floor(new Date().getTime() / 1000),
        cliffDuration: 86400,
        vestingDuration: 864000,
      },
      {
        candidate: wallet_3.address,
        allocationType: 1,
        totalVestingAmount: 2000,
        TGE: 100,
        start: Math.floor(new Date().getTime() / 1000),
        cliffDuration: 86400,
        vestingDuration: 864000,
      },
      {
        candidate: wallet_4.address,
        allocationType: 1,
        totalVestingAmount: 3000,
        TGE: 100,
        start: Math.floor(new Date().getTime() / 1000),
        cliffDuration: 86400,
        vestingDuration: 864000,
      },
    ];

    const leafNodes = buyVesting.map((obj) => {
      let leafNode = ethers.utils.solidityPack(
        ["address", "uint", "uint256", "uint128", "uint128", "uint128", "uint128"],
        [obj.candidate, obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration]
      );
      return ethers.utils.solidityKeccak256(["bytes"], [leafNode]);
    });

    //console.log(leafNodes)


    vestingMerkleTree = new MerkleTree(leafNodes, keccak256, {
      sortPairs: true,
    });

    // await nft.connect(wallet_1).mint(wallet_1.address, 1);

    // const adminRole = ethers.utils.solidityPack(["string"], ["ADMIN_ROLE"]);
    // const ADMIN_ROLE = ethers.utils.solidityKeccak256(["bytes"], [adminRole]);
    // await treasury.grantRole(ADMIN_ROLE, wallet_2.address);

    return { owner, vesting, token, vestingDistributionAddress, wallet_1, wallet_2, wallet_3, wallet_4, vestingMerkleTree };
  }

  describe("Deployment", function () {
    it("Should deploy success", async function() {
      const { owner, vesting, token, vestingDistributionAddress, wallet_1, wallet_2 } = await loadFixture(deployVesting);
      
      //console.log(vesting)
      expect(await vesting.owner()).to.equal(owner.address);
    });
  });

  describe("Main Flow", function () {
    it("Should update root", async function () {
      const { owner, vesting, token, vestingDistributionAddress, wallet_1, wallet_2, wallet_3, wallet_4, vestingMerkleTree } = await loadFixture(deployVesting); 

      vestingRootHash = vestingMerkleTree.getRoot();
      let vestingRoot = "0x".concat(String(vestingRootHash.toString('hex')));
    
      await vesting.connect(owner).updateRoot(vestingRootHash);

      let rootUpdated = await vesting.root();

      expect(String(rootUpdated)).to.be.equal(vestingRoot);

      // console.log(await vesting.root())
  
      //await time.increase(1000);

      // obj = buyWhiteList[1];
      // from = accounts[1];
      // const data = 0x123;
      // const leaf = ethers.utils.solidityPack(
      //   ["address", "uint256", "uint256", "uint256"],
      //   [obj.candidate, obj.id, obj.minQuantity, obj.maxQuantity]
      // );
      // const leafNode = ethers.utils.solidityKeccak256(["bytes"], [leaf]);
      // const proof = buyMerkleTree.getHexProof(leafNode);
      // prevBalance = await USDC.balanceOf(from.address);
  
      // await idoPool
      //   .connect(from)
      //   .buyTicket(
      //     ethers.BigNumber.from(100),
      //     obj.maxQuantity / 2,
      //     obj.maxQuantity,
      //     obj.minQuantity,
      //     obj.id,
      //     data,
      //     proof
      //   );
  
      // expect(await idoPool.userTicket(obj.id, from.address)).to.be.equal(
      //   obj.maxQuantity / 2
      // );
    });

    it("Should claim token", async function() {
      vestingRootHash = vestingMerkleTree.getRoot();
      await vesting.connect(owner).updateRoot(vestingRootHash);
      
    });
  });


});

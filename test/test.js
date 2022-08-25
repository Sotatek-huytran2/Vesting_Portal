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

describe("VESTING", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployVesting() {
    const [
      owner, angleAddress, preSeedAddress,
      seedAddress, private_1_Address, private_2_Address,
      publicAddress, rewardAddress, teamAddress,
      advisorsAddress, marketingAddress, researchFoundationAddress,
      operationsAddress, ecosystemAddress, liquidityAddress,
      reserveAddress,
      wallet_1, wallet_2, wallet_3, wallet_4,
    ] = await ethers.getSigners();


    const vestingDistributionAddress = [
      angleAddress.address, preSeedAddress.address,
      seedAddress.address, private_1_Address.address, private_2_Address.address,
      publicAddress.address, rewardAddress.address, teamAddress.address,
      advisorsAddress.address, marketingAddress.address, researchFoundationAddress.address,
      operationsAddress.address, ecosystemAddress.address, liquidityAddress.address,
      reserveAddress.address
    ]

    // const vestingDistributionAddress = [angleAddress, preSeedAddress,
    //     seedAddress, private_1_Address, private_2_Address,
    //     publicAddress, rewardAddress, teamAddress,
    //     advisorsAddress, marketingAddress, researchFoundationAddress,
    //     operationsAddress, ecosystemAddress, liquidityAddress,
    //     reserveAddress
    // ]
    
    const TOKEN = await ethers.getContractFactory("Token");
    const token = await TOKEN.deploy("TOKEN A", "TOKEN A");

    const VESTING = await ethers.getContractFactory("Vesting");
    const vesting = await VESTING.deploy();

    await vesting.connect(owner).initialize(token.address, vestingDistributionAddress);

    await token.connect(preSeedAddress).mint(preSeedAddress.address, ethers.BigNumber.from(1000000));
    await token.connect(preSeedAddress).approve(vesting.address, ethers.BigNumber.from(1000000));

    const startTime_1 =  Math.floor(new Date().getTime() / 1000);

    buyVesting = [
      {
        candidate: wallet_1.address,
        allocationType: 1,
        totalVestingAmount: 100,
        TGE: 1000,
        start: Math.floor(new Date().getTime() / 1000),
        cliffDuration: 86400,
        vestingDuration: 864000,
      },
      {
        candidate: wallet_2.address,
        allocationType: 1,
        totalVestingAmount: 100,
        TGE: 1000,
        start: Math.floor(new Date().getTime() / 1000),
        cliffDuration: 86400,
        vestingDuration: 864000,
      },
      {
        candidate: wallet_3.address,
        allocationType: 1,
        totalVestingAmount: 2000,
        TGE: 1000,
        start: Math.floor(new Date().getTime() / 1000),
        cliffDuration: 86400,
        vestingDuration: 864000,
      },
      {
        candidate: wallet_4.address,
        allocationType: 1,
        totalVestingAmount: ethers.BigNumber.from(100),
        TGE: 1000,
        start: startTime_1,
        cliffDuration: 86400,
        vestingDuration: 864000,
      },
    ];

    const leafNodes = buyVesting.map((obj) => {
      let leafNode = ethers.utils.solidityPack(
        ["address", "uint", "uint256", "uint16", "uint32", "uint32", "uint32"],
        [obj.candidate, obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration]
      );
      return ethers.utils.solidityKeccak256(["bytes"], [leafNode]);
    });

    vestingMerkleTree = new MerkleTree(leafNodes, keccak256, {
      sortPairs: true,
    });

    // const adminRole = ethers.utils.solidityPack(["string"], ["ADMIN_ROLE"]);
    // const ADMIN_ROLE = ethers.utils.solidityKeccak256(["bytes"], [adminRole]);
    // await treasury.grantRole(ADMIN_ROLE, wallet_2.address);

    return { owner, vesting, token, vestingDistributionAddress, wallet_2, wallet_4, vestingMerkleTree, startTime_1, buyVesting };
  }

  describe("Deployment", function () {
    it("Should deploy success", async function() {
      const { owner, vesting, token, vestingDistributionAddress } = await loadFixture(deployVesting);
      
      //console.log(vesting)
      expect(await vesting.owner()).to.equal(owner.address);
    });
  });

  describe("Main Flow", function () {
    it("Should update root", async function () {
      const { owner, vesting, token, vestingDistributionAddress, wallet_2, wallet_4, vestingMerkleTree } = await loadFixture(deployVesting); 

      vestingRootHash = vestingMerkleTree.getRoot();
      let vestingRoot = "0x".concat(String(vestingRootHash.toString('hex')));
      await vesting.connect(owner).updateRoot(vestingRootHash);
      let rootUpdated = await vesting.root();
      expect(String(rootUpdated)).to.be.equal(vestingRoot);

      // console.log(await vesting.root())
  
      //await time.increase(1000);

      
    });

    it("Should claim TGE", async function() {
      const { owner, vesting, token, vestingDistributionAddress, wallet_2, wallet_4, vestingMerkleTree, startTime_1, buyVesting } = await loadFixture(deployVesting); 

      vestingRootHash = vestingMerkleTree.getRoot();
      let vestingRoot = "0x".concat(String(vestingRootHash.toString('hex')));
      await vesting.connect(owner).updateRoot(vestingRootHash);
      let rootUpdated = await vesting.root();
      expect(String(rootUpdated)).to.be.equal(vestingRoot);

      obj = buyVesting[3];
    
      const leaf = ethers.utils.solidityPack(
        ["address", "uint", "uint256", "uint16", "uint32", "uint32", "uint32"],
        [obj.candidate, obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration]
      );

      const leafNode = ethers.utils.solidityKeccak256(["bytes"], [leaf]);
      const proof = vestingMerkleTree.getHexProof(leafNode);
      const prevBalance = await token.balanceOf(wallet_4.address);

      await vesting
        .connect(wallet_4)
        .claimToken(
          obj.allocationType,
          obj.totalVestingAmount,
          obj.TGE,
          obj.start,
          obj.cliffDuration,
          obj.vestingDuration,
          proof
      );

      //const abc = await vesting.connect(wallet_4).userVestingSchedule(wallet_4.address, 1);
      const aftBalance = await token.balanceOf(wallet_4.address);
      const aaaa = ethers.BigNumber.from(10);

      expect(aftBalance).to.be.gt(prevBalance);
      expect(aftBalance).to.be.equal(aaaa);    
    });

    it("Should claim TGE && 1 day Vest", async function() {
      const { owner, vesting, token, vestingDistributionAddress, wallet_2, wallet_4, vestingMerkleTree, startTime_1, buyVesting } = await loadFixture(deployVesting); 

      vestingRootHash = vestingMerkleTree.getRoot();
      let vestingRoot = "0x".concat(String(vestingRootHash.toString('hex')));
      await vesting.connect(owner).updateRoot(vestingRootHash);
      let rootUpdated = await vesting.root();
      expect(String(rootUpdated)).to.be.equal(vestingRoot);

      obj = buyVesting[3];
    
      const leaf = ethers.utils.solidityPack(
        ["address", "uint", "uint256", "uint16", "uint32", "uint32", "uint32"],
        [obj.candidate, obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration]
      );

      const leafNode = ethers.utils.solidityKeccak256(["bytes"], [leaf]);
      const proof = vestingMerkleTree.getHexProof(leafNode);
      const prevBalance = await token.balanceOf(wallet_4.address);

      await time.increase(86401);

      await vesting
        .connect(wallet_4)
        .claimToken(
          obj.allocationType,
          obj.totalVestingAmount,
          obj.TGE,
          obj.start,
          obj.cliffDuration,
          obj.vestingDuration,
          proof
      );

      //const abc = await vesting.connect(wallet_4).userVestingSchedule(wallet_4.address, 1);

      const aftBalance = await token.balanceOf(wallet_4.address);
      const tgeAndOneDayVesting = ethers.BigNumber.from(19);

      expect(aftBalance).to.be.gt(prevBalance);
      expect(aftBalance).to.be.equal(tgeAndOneDayVesting);    
    });

    it("Should claim TGE && Claim the rest", async function() {
      const { owner, vesting, token, vestingDistributionAddress, wallet_2, wallet_4, vestingMerkleTree, startTime_1, buyVesting } = await loadFixture(deployVesting); 

      vestingRootHash = vestingMerkleTree.getRoot();
      let vestingRoot = "0x".concat(String(vestingRootHash.toString('hex')));
      await vesting.connect(owner).updateRoot(vestingRootHash);
      let rootUpdated = await vesting.root();
      expect(String(rootUpdated)).to.be.equal(vestingRoot);

      obj = buyVesting[3];
    
      const leaf = ethers.utils.solidityPack(
        ["address", "uint", "uint256", "uint16", "uint32", "uint32", "uint32"],
        [obj.candidate, obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration]
      );

      const leafNode = ethers.utils.solidityKeccak256(["bytes"], [leaf]);
      const proof = vestingMerkleTree.getHexProof(leafNode);

      await vesting
        .connect(wallet_4)
        .claimToken(
          obj.allocationType,
          obj.totalVestingAmount,
          obj.TGE,
          obj.start,
          obj.cliffDuration,
          obj.vestingDuration,
          proof
      );

      const tgeAndOneDayVesting = ethers.BigNumber.from(10);
      const aftTGEBalance = await token.balanceOf(wallet_4.address);
      expect(aftTGEBalance).to.be.equal(tgeAndOneDayVesting);

      await time.increase(864001);

      await vesting
        .connect(wallet_4)
        .claimToken(
          obj.allocationType,
          obj.totalVestingAmount,
          obj.TGE,
          obj.start,
          obj.cliffDuration,
          obj.vestingDuration,
          proof
      );

      const fullVestBalance = ethers.BigNumber.from(100);
      const aftFullVestBalance = await token.balanceOf(wallet_4.address);
      expect(aftFullVestBalance).to.be.equal(fullVestBalance);    
    });

    it("Should claim TGE && Wait to claim 1 day vest", async function() {
      const { owner, vesting, token, vestingDistributionAddress, wallet_2, wallet_4, vestingMerkleTree, startTime_1, buyVesting } = await loadFixture(deployVesting); 

      vestingRootHash = vestingMerkleTree.getRoot();
      let vestingRoot = "0x".concat(String(vestingRootHash.toString('hex')));
      await vesting.connect(owner).updateRoot(vestingRootHash);
      let rootUpdated = await vesting.root();
      expect(String(rootUpdated)).to.be.equal(vestingRoot);

      obj = buyVesting[3];
    
      const leaf = ethers.utils.solidityPack(
        ["address", "uint", "uint256", "uint16", "uint32", "uint32", "uint32"],
        [obj.candidate, obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration]
      );

      const leafNode = ethers.utils.solidityKeccak256(["bytes"], [leaf]);
      const proof = vestingMerkleTree.getHexProof(leafNode);

      await vesting
        .connect(wallet_4)
        .claimToken(
          obj.allocationType,
          obj.totalVestingAmount,
          obj.TGE,
          obj.start,
          obj.cliffDuration,
          obj.vestingDuration,
          proof
      );

      const tgeAndOneDayVesting = ethers.BigNumber.from(10);
      const aftTGEBalance = await token.balanceOf(wallet_4.address);
      expect(aftTGEBalance).to.be.equal(tgeAndOneDayVesting);

      await time.increase(86401);

      await vesting
        .connect(wallet_4)
        .claimToken(
          obj.allocationType,
          obj.totalVestingAmount,
          obj.TGE,
          obj.start,
          obj.cliffDuration,
          obj.vestingDuration,
          proof
      );

      //const abc = await vesting.connect(wallet_4).userVestingSchedule(wallet_4.address, 1);

      const oneDayVestBalance = ethers.BigNumber.from(19);
      const aftOneDayVestBalance = await token.balanceOf(wallet_4.address);
      expect(aftOneDayVestBalance).to.be.equal(oneDayVestBalance);    
    });

    it("Should claim TGE && Wait to claim 1 day vest && Claim the rest", async function() {
      const { owner, vesting, token, vestingDistributionAddress, wallet_2, wallet_4, vestingMerkleTree, startTime_1, buyVesting } = await loadFixture(deployVesting); 

      vestingRootHash = vestingMerkleTree.getRoot();
      let vestingRoot = "0x".concat(String(vestingRootHash.toString('hex')));
      await vesting.connect(owner).updateRoot(vestingRootHash);
      let rootUpdated = await vesting.root();
      expect(String(rootUpdated)).to.be.equal(vestingRoot);

      obj = buyVesting[3];
    
      const leaf = ethers.utils.solidityPack(
        ["address", "uint", "uint256", "uint16", "uint32", "uint32", "uint32"],
        [obj.candidate, obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration]
      );

      const leafNode = ethers.utils.solidityKeccak256(["bytes"], [leaf]);
      const proof = vestingMerkleTree.getHexProof(leafNode);

      await vesting
        .connect(wallet_4)
        .claimToken(
          obj.allocationType,
          obj.totalVestingAmount,
          obj.TGE,
          obj.start,
          obj.cliffDuration,
          obj.vestingDuration,
          proof
      );

      const tgeAndOneDayVesting = ethers.BigNumber.from(10);
      const aftTGEBalance = await token.balanceOf(wallet_4.address);
      expect(aftTGEBalance).to.be.equal(tgeAndOneDayVesting);

      await time.increase(86401);

      await vesting
        .connect(wallet_4)
        .claimToken(
          obj.allocationType,
          obj.totalVestingAmount,
          obj.TGE,
          obj.start,
          obj.cliffDuration,
          obj.vestingDuration,
          proof
      );

      //const abc = await vesting.connect(wallet_4).userVestingSchedule(wallet_4.address, 1);

      const oneDayVestBalance = ethers.BigNumber.from(19);
      const aftOneDayVestBalance = await token.balanceOf(wallet_4.address);
      expect(aftOneDayVestBalance).to.be.equal(oneDayVestBalance);    


      await time.increase(864001);

      await vesting
        .connect(wallet_4)
        .claimToken(
          obj.allocationType,
          obj.totalVestingAmount,
          obj.TGE,
          obj.start,
          obj.cliffDuration,
          obj.vestingDuration,
          proof
      );

      const fullVestBalance = ethers.BigNumber.from(100);
      const aftFullVestBalance = await token.balanceOf(wallet_4.address);
      expect(aftFullVestBalance).to.be.equal(fullVestBalance);    
    });


    it("Shouldn't claim TGE if wrong root", async function() {
      const { owner, vesting, token, vestingDistributionAddress, wallet_2, wallet_4, vestingMerkleTree, startTime_1, buyVesting } = await loadFixture(deployVesting); 

      vestingRootHash = vestingMerkleTree.getRoot();
      let vestingRoot = "0x".concat(String(vestingRootHash.toString('hex')));
      await vesting.connect(owner).updateRoot(vestingRootHash);
      let rootUpdated = await vesting.root();
      expect(String(rootUpdated)).to.be.equal(vestingRoot);

      obj = buyVesting[3];
    
      const leaf = ethers.utils.solidityPack(
        ["address", "uint", "uint256", "uint16", "uint32", "uint32", "uint32"],
        [obj.candidate, obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration]
      );

      const leafNode = ethers.utils.solidityKeccak256(["bytes"], [leaf]);
      const proof = vestingMerkleTree.getHexProof(leafNode);
      

      await expect(vesting.connect(wallet_4).claimToken(obj.allocationType, ethers.BigNumber.from(19), obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration, proof)).to.be.reverted;
    });

    it("Shouldn't claim TGE if TGE larger than 100%", async function() {
      const { owner, vesting, token, vestingDistributionAddress, wallet_2, wallet_4, vestingMerkleTree, startTime_1, buyVesting } = await loadFixture(deployVesting); 

      vestingRootHash = vestingMerkleTree.getRoot();
      let vestingRoot = "0x".concat(String(vestingRootHash.toString('hex')));
      await vesting.connect(owner).updateRoot(vestingRootHash);
      let rootUpdated = await vesting.root();
      expect(String(rootUpdated)).to.be.equal(vestingRoot);

      obj = buyVesting[3];
    
      const leaf = ethers.utils.solidityPack(
        ["address", "uint", "uint256", "uint16", "uint32", "uint32", "uint32"],
        [obj.candidate, obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration]
      );

      const leafNode = ethers.utils.solidityKeccak256(["bytes"], [leaf]);
      const proof = vestingMerkleTree.getHexProof(leafNode);
      

      await expect(vesting.connect(wallet_4).claimToken(obj.allocationType, obj.totalVestingAmount, 10010, obj.start, obj.cliffDuration, obj.vestingDuration, proof)).to.be.reverted;
    });

    it("Shouldn't claim if claim enough", async function() {
      const { owner, vesting, token, vestingDistributionAddress, wallet_2, wallet_4, vestingMerkleTree, startTime_1, buyVesting } = await loadFixture(deployVesting); 

      vestingRootHash = vestingMerkleTree.getRoot();
      let vestingRoot = "0x".concat(String(vestingRootHash.toString('hex')));
      await vesting.connect(owner).updateRoot(vestingRootHash);
      let rootUpdated = await vesting.root();
      expect(String(rootUpdated)).to.be.equal(vestingRoot);

      obj = buyVesting[3];
    
      const leaf = ethers.utils.solidityPack(
        ["address", "uint", "uint256", "uint16", "uint32", "uint32", "uint32"],
        [obj.candidate, obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration]
      );

      const leafNode = ethers.utils.solidityKeccak256(["bytes"], [leaf]);
      const proof = vestingMerkleTree.getHexProof(leafNode);
    
      await vesting
        .connect(wallet_4)
        .claimToken(
          obj.allocationType,
          obj.totalVestingAmount,
          obj.TGE,
          obj.start,
          obj.cliffDuration,
          obj.vestingDuration,
          proof
      );

      const tgeAndOneDayVesting = ethers.BigNumber.from(10);
      const aftTGEBalance = await token.balanceOf(wallet_4.address);
      expect(aftTGEBalance).to.be.equal(tgeAndOneDayVesting);

      await time.increase(864001);

      await vesting
        .connect(wallet_4)
        .claimToken(
          obj.allocationType,
          obj.totalVestingAmount,
          obj.TGE,
          obj.start,
          obj.cliffDuration,
          obj.vestingDuration,
          proof
      );

      await expect(vesting.connect(wallet_4).claimToken(obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration, proof)).to.be.reverted;
    });

    it("Shouldn't claim if still in cliff", async function() {
      const { owner, vesting, token, vestingDistributionAddress, wallet_2, wallet_4, vestingMerkleTree, startTime_1, buyVesting } = await loadFixture(deployVesting); 

      vestingRootHash = vestingMerkleTree.getRoot();
      let vestingRoot = "0x".concat(String(vestingRootHash.toString('hex')));
      await vesting.connect(owner).updateRoot(vestingRootHash);
      let rootUpdated = await vesting.root();
      expect(String(rootUpdated)).to.be.equal(vestingRoot);

      obj = buyVesting[3];
    
      const leaf = ethers.utils.solidityPack(
        ["address", "uint", "uint256", "uint16", "uint32", "uint32", "uint32"],
        [obj.candidate, obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration]
      );

      const leafNode = ethers.utils.solidityKeccak256(["bytes"], [leaf]);
      const proof = vestingMerkleTree.getHexProof(leafNode);
    
      await vesting
        .connect(wallet_4)
        .claimToken(
          obj.allocationType,
          obj.totalVestingAmount,
          obj.TGE,
          obj.start,
          obj.cliffDuration,
          obj.vestingDuration,
          proof
      );

      const tgeAndOneDayVesting = ethers.BigNumber.from(10);
      const aftTGEBalance = await token.balanceOf(wallet_4.address);
      expect(aftTGEBalance).to.be.equal(tgeAndOneDayVesting);

      await time.increase(100);

      await expect(vesting.connect(wallet_4).claimToken(obj.allocationType, obj.totalVestingAmount, obj.TGE, obj.start, obj.cliffDuration, obj.vestingDuration, proof)).to.be.reverted;
    });


  });


});

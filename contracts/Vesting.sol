// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";

contract Vesting is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {

    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint16 public  ANGEL_ADDRESS_INDEX;
    uint16 public  PRESEED_ADDRESS_INDEX;
    uint16 public  SEED_ADDRESS_INDEX;
    uint16 public  PRIVATE_1_ADDRESS_INDEX;
    uint16 public  PRIVATE_2_ADDRESS_INDEX;
    uint16 public  PUBLIC_ADDRESS_INDEX;
    uint16 public  REWARDS_ADDRESS_INDEX;
    uint16 public  TEAM_ADDRESS_INDEX;
    uint16 public  ADVISORS_ADDRESS_INDEX;
    uint16 public  MARKETING_ADDRESS_INDEX;
    uint16 public  RESEARCH_FOUNDATION_ADDRESS_INDEX;
    uint16 public  OPERATIONS_ADDRESS_INDEX;
    uint16 public  ECOSYSTEM_ADDRESS_INDEX;
    uint16 public  LIQUIDITY_ADDRESS_INDEX;
    uint16 public  REVERSE_ADDRESS_INDEX;

    address public token;

    uint32 public VESTING_FREQUENCY;
    uint32 constant public PRECISE_TGE = 10000;
    bytes32 public root;

    // bytes32 constant public BIG_ADMIN_ROLE = keccak256("BIG_ADMIN_ROLE");
    // bytes32 constant public ADMIN_ROLE = keccak256("ADMIN_ROLE");


    struct VestingSchedule{
        // address receive token vesting
        address user;
        // total allocation vesting of user
        uint256 totalVestingAmount;
        // amount TGE claimed
        uint256 TGEAmount;
        // total amount claimed
        uint256 claimed;
        // Merkle Tree last time claimed
        uint256 merkleTreeClaimed;
        // id of user
        uint32 id;
        // start vesting time
        uint32 start;
        // cliff duration
        uint32 cliff;
        // vesting duration
        uint32 duration;
        // last time day Index
        uint32 lasTimeStampClaim;
        // TGE percentage
        uint16 TGE;
    }

    mapping(uint32 =>  mapping(uint => VestingSchedule)) public userVestingSchedule;
    mapping(uint => address) public allocationAddress; 
    mapping(address => bool) public admin;

    event UpdateAdmin(address indexed user, bool status);
    event ClaimToken(address user, uint32 id, uint allocationType, uint256 claimed, uint256 totalVestingAmount, uint16 TGE, uint32 startTime, uint32 cliffDuration, uint32 vestingDuration, bytes32[] proof);

    // constructor(address _token, address _vestingDistributionAddress) {
    //     token = _token;
    //     vestingDistributionAddress = _vestingDistributionAddress;
    //     admin[msg.sender] = true;
    // }

    function initialize(address _token, uint32 _vestingFrequency, address[15] calldata _address) external initializer {

        token = _token;
        admin[msg.sender] = true;
        VESTING_FREQUENCY = _vestingFrequency;

        // _setRoleAdmin(ADMIN_ROLE, BIG_ADMIN_ROLE);
        // _setupRole(BIG_ADMIN_ROLE, msg.sender);
        // _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        ANGEL_ADDRESS_INDEX = 0;
        PRESEED_ADDRESS_INDEX = 1;
        SEED_ADDRESS_INDEX = 2;
        PRIVATE_1_ADDRESS_INDEX = 3;
        PRIVATE_2_ADDRESS_INDEX = 4;
        PUBLIC_ADDRESS_INDEX = 5;
        REWARDS_ADDRESS_INDEX = 6;
        TEAM_ADDRESS_INDEX = 7;
        ADVISORS_ADDRESS_INDEX = 8;
        MARKETING_ADDRESS_INDEX = 9;
        RESEARCH_FOUNDATION_ADDRESS_INDEX = 10;
        OPERATIONS_ADDRESS_INDEX = 11;
        ECOSYSTEM_ADDRESS_INDEX = 12;
        LIQUIDITY_ADDRESS_INDEX = 13;
        REVERSE_ADDRESS_INDEX = 14;
    
        allocationAddress[ANGEL_ADDRESS_INDEX] = _address[ANGEL_ADDRESS_INDEX];
        allocationAddress[PRESEED_ADDRESS_INDEX] = _address[PRESEED_ADDRESS_INDEX];
        allocationAddress[SEED_ADDRESS_INDEX] = _address[SEED_ADDRESS_INDEX];
        allocationAddress[PRIVATE_1_ADDRESS_INDEX] = _address[PRIVATE_1_ADDRESS_INDEX];
        allocationAddress[PRIVATE_2_ADDRESS_INDEX] = _address[PRIVATE_2_ADDRESS_INDEX];
        allocationAddress[PUBLIC_ADDRESS_INDEX] = _address[PUBLIC_ADDRESS_INDEX];
        allocationAddress[REWARDS_ADDRESS_INDEX] = _address[REWARDS_ADDRESS_INDEX];
        allocationAddress[TEAM_ADDRESS_INDEX] = _address[TEAM_ADDRESS_INDEX];
        allocationAddress[ADVISORS_ADDRESS_INDEX] = _address[ADVISORS_ADDRESS_INDEX];
        allocationAddress[MARKETING_ADDRESS_INDEX] = _address[MARKETING_ADDRESS_INDEX];
        allocationAddress[RESEARCH_FOUNDATION_ADDRESS_INDEX] = _address[RESEARCH_FOUNDATION_ADDRESS_INDEX];
        allocationAddress[OPERATIONS_ADDRESS_INDEX] = _address[OPERATIONS_ADDRESS_INDEX];
        allocationAddress[ECOSYSTEM_ADDRESS_INDEX] = _address[ECOSYSTEM_ADDRESS_INDEX];
        allocationAddress[LIQUIDITY_ADDRESS_INDEX] = _address[LIQUIDITY_ADDRESS_INDEX];
        allocationAddress[REVERSE_ADDRESS_INDEX] = _address[REVERSE_ADDRESS_INDEX];

        __Ownable_init();
        __Pausable_init();
    }
    
    function addAdmin(address _AddAdmin) external onlyOwner {
        admin[_AddAdmin] = true;

        emit UpdateAdmin(_AddAdmin, true);
    }

    function removeAdmin(address _RemoveAdmin) external onlyOwner {
        admin[_RemoveAdmin] = false; 

        emit UpdateAdmin(_RemoveAdmin, false);
    }

    function updateRoot(bytes32 _root) external onlyAdmin {
        root = _root;
    }

    function updateTokenAddress(address _token) external onlyAdmin {
        token = _token;
    }

    function updateVestingFrequency(uint32 _frequency) external onlyAdmin {
        VESTING_FREQUENCY = _frequency;
    }

    function updateAllocationAddress(uint16 _allocationIndex, address _address) external onlyAdmin {
        require(_allocationIndex <= 14, "INVALID INDEX");
        allocationAddress[_allocationIndex] = _address;
    }

    function claimToken(uint32 _id, uint _allocationType, uint256 _totalVestingAmount, uint16 _TGE, uint32 _startTime, uint32 _cliffDuration, uint32 _vestingDuration, bytes32[] memory proof) external nonReentrant whenNotPaused { 

        VestingSchedule storage user = userVestingSchedule[_id][_allocationType];

        require(_TGE <= 10000, "INVALID TGE");
        require(_verifyVestingUser(msg.sender, _id, _allocationType, _totalVestingAmount, _TGE, _startTime, _cliffDuration, _vestingDuration, proof), "INVALID_MERKLE");
        
        if (user.totalVestingAmount == 0) {
            user.totalVestingAmount = _totalVestingAmount;
            user.start = _startTime;
            user.cliff = _cliffDuration;
            user.duration = _vestingDuration;
            user.id = _id;
            user.user = msg.sender;
        }

        if (user.user != msg.sender) {
            user.user = msg.sender;
        }

        require(user.claimed + user.TGEAmount < _totalVestingAmount , "Claim Enough");
        
        uint256 amountVesting;

        if (user.TGE == 0 && user.lasTimeStampClaim == 0) {

            uint256 tgeVesting = (_totalVestingAmount * _TGE) / PRECISE_TGE;
            user.TGEAmount = tgeVesting;
            amountVesting = tgeVesting;
            user.lasTimeStampClaim = (_startTime + _cliffDuration);

            if (block.timestamp >= _startTime + _cliffDuration) {

                // amount token after cliff duration
                (uint256 claimable, uint32 nextDaysClaim) = claimableToken(_id, _allocationType);
                amountVesting = amountVesting + claimable;
                
                user.lasTimeStampClaim = user.lasTimeStampClaim + (nextDaysClaim * VESTING_FREQUENCY);
                user.claimed = user.claimed + claimable;            
            }

            user.TGE = _TGE;
        }
        else {
            require(block.timestamp >= user.start + user.cliff, "Cliff Error");
            require(block.timestamp >= user.lasTimeStampClaim, "Period Error");
            
            uint32 nextDaysClaim;

            (amountVesting, nextDaysClaim) = claimableToken(_id, _allocationType);

            user.claimed = user.claimed + amountVesting;
            user.lasTimeStampClaim = user.lasTimeStampClaim + (nextDaysClaim * VESTING_FREQUENCY);
        }
        
        IERC20Upgradeable(token).safeTransferFrom(address(allocationAddress[_allocationType]), address(msg.sender), amountVesting);

        emit ClaimToken(msg.sender, _id, _allocationType, amountVesting, _totalVestingAmount, _TGE, _startTime, _cliffDuration, _vestingDuration, proof);
    }

    function claimableToken(uint32 _id, uint _allocationType) public view returns(uint256, uint32) {
        VestingSchedule storage user = userVestingSchedule[_id][_allocationType];

        uint32 claimTimes;
        uint32 dayIndex = uint32(block.timestamp / VESTING_FREQUENCY);
        uint32 dayIndexBefore = uint32(user.lasTimeStampClaim / VESTING_FREQUENCY);

        if (dayIndex < dayIndexBefore) {
            return (0, 0);
        }

        if (VESTING_FREQUENCY == 1) {
            claimTimes = dayIndex - dayIndexBefore;
        }
        else {
            claimTimes = dayIndex - dayIndexBefore + 1;
        }

        uint256 dayDurationVesting = user.duration / VESTING_FREQUENCY;

        if (dayDurationVesting <= 0) {
            return ((user.totalVestingAmount - user.TGEAmount), claimTimes);
        }

        if (block.timestamp >=  user.start + user.cliff + user.duration) {
            return (((user.totalVestingAmount - user.TGEAmount) - user.claimed), claimTimes);
        }

        // uint256 remainTime = (((block.timestamp - user.lastTimeStamp) * PERICSE_FACTOR) / user.duration);
        // uint256 amountVesting = ((user.totalVestingAmount - user.TGEAmount) * remainTime) / PERICSE_FACTOR;

        uint256 amountVesting = ((user.totalVestingAmount - user.TGEAmount) / dayDurationVesting) * claimTimes;  
        
        return (amountVesting, claimTimes);
    }

    //function updateVestingScheadule(uint _allocationType, uint256 _totalVestingAmount, uint128 _TGE, uint128 _startTime, uint128 _cliffDuration, uint128 _vestingDuration) external {}

    function _verifyVestingUser(
       address _user,
       uint32 _id,
       uint _allocationType,
       uint256 _totalVestingAmount, 
       uint16 _TGE, 
       uint32 _startTime, 
       uint32 _cliffDuration, 
       uint32 _vestingDuration,
       bytes32[] memory proof
    ) internal view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_user, _id, _allocationType, _totalVestingAmount, _TGE, _startTime, _cliffDuration, _vestingDuration));

        return MerkleProofUpgradeable.verify(proof, root, leaf);
    }

    function getRemainVestingToken(address _token) public view returns(uint256) {
        return IERC20Upgradeable(_token).balanceOf(address(this));
    }

    function emergencyWithdraw(address _token) external onlyAdmin {
        uint256 balance = getRemainVestingToken(_token);

        IERC20Upgradeable(_token).transfer(msg.sender, balance);
    } 

    function viewBlock() external view returns(uint256) {
        return block.timestamp;
    }

    modifier onlyAdmin() {
        require(admin[msg.sender] == true, "Caller is not admin");
        _; 
    }   
}



// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Vesting is Ownable, AccessControl, ReentrancyGuard, Pausable {

    using SafeERC20 for IERC20;

    address public token;
    address public vestingDistributionAddress;
    uint256 public PERICSE_FACTOR = 10**12;
    bytes32 public root;


    struct VestingSchedule{
        uint256 totalVestingAmount;
        // amount TGE claimed
        uint256 TGEAmount;
        // total amount claimed
        uint256 claimed;
        // start vesting time
        uint256 start;
        // cliff duration
        uint256 cliff;
        // vesting duration
        uint256 duration;
        // lastTimestamp claim token
        uint256 lastTimeStamp;
        
        uint256 lasTimeStampClaim;
        // TGE percentage
        uint128 TGE;

    }

    mapping(address =>  mapping(uint => VestingSchedule)) public userVestingSchedule;
    mapping(address => bool) public admin;

    event UpdateAdmin(address indexed user, bool status);

    constructor(address _token, address _vestingDistributionAddress) {
        token = _token;
        vestingDistributionAddress = _vestingDistributionAddress;
        admin[msg.sender] = true;
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

    // Mapping: check TGE, current vesting amount, lastTimeStamp 
    // Merkle tree leaf: Address, Total Vesting Amount, TGE, StartVestingTime, CliffTime, Vesting Period, 

    function claimToken(uint _allocationType, uint256 _totalVestingAmount, uint128 _TGE, uint128 _startTime, uint128 _cliffDuration, uint128 _vestingDuration, bytes32[] memory proof) external nonReentrant { 

        VestingSchedule storage user = userVestingSchedule[msg.sender][_allocationType];

        require(_verifyVestingUser(msg.sender, _allocationType, _totalVestingAmount, _TGE, _startTime, _cliffDuration, _vestingDuration, proof), "INVALID_MERKLE");
        require(user.claimed + user.TGEAmount < _totalVestingAmount , "Claim Enough");

        if (user.totalVestingAmount == 0) {
            user.totalVestingAmount = _totalVestingAmount;
            user.start = _startTime;
            user.cliff = _cliffDuration;
            user.duration = _vestingDuration;
        }
        
        uint256 amountVesting;

        if (user.TGE == 0) {

            if (block.timestamp < _startTime + _cliffDuration) {
                amountVesting = (_totalVestingAmount * _TGE) / 10000;
                user.TGEAmount = amountVesting;
                
                user.lasTimeStampClaim = (_startTime + _cliffDuration) / (60 * 60 * 24);
            }
            else {
                // amount tge Token
                uint256 tgeVesting = (_totalVestingAmount * _TGE) / 10000;
                user.TGEAmount = tgeVesting;
  
                
                // amount token after cliff duration
                user.lasTimeStampClaim = (_startTime + _cliffDuration) / (60 * 60 * 24);
                (uint256 claimable, uint256 nextDaysClaim) = claimableToken(msg.sender, _allocationType);
                amountVesting = claimable + tgeVesting;
                
                user.lasTimeStampClaim = user.lasTimeStampClaim + nextDaysClaim;
                user.claimed = user.claimed + claimable;
            }

            user.TGE = _TGE;
            user.lastTimeStamp = block.timestamp;
        }
        else {
            require(block.timestamp >= user.start + user.cliff, "Cliff Error");
            require(block.timestamp / (60 * 60 * 24) >= user.lasTimeStampClaim, "Period Error");
            
            uint256 nextDaysClaim;

            (amountVesting, nextDaysClaim) = claimableToken(msg.sender, _allocationType);

            user.claimed = user.claimed + amountVesting;
            user.lastTimeStamp = block.timestamp;
            user.lasTimeStampClaim = user.lasTimeStampClaim + nextDaysClaim;
        }
        
        IERC20(token).safeTransferFrom(address(vestingDistributionAddress), address(msg.sender), amountVesting);
    }

    function claimableToken(address _user, uint _allocationType) public view returns(uint256, uint256) {
        VestingSchedule storage user = userVestingSchedule[_user][_allocationType];

        uint256 dayIndex = block.timestamp / (60 * 60 * 24);
        uint256 claimTimes = dayIndex - user.lasTimeStampClaim + 1;
        uint256 dayDurationVesting = user.duration / (60 * 60 * 24);

        if (block.timestamp >=  user.start + user.cliff + user.duration) {
            return (((user.totalVestingAmount - user.TGEAmount) - user.claimed), claimTimes);
        }

        // uint256 remainTime = (((block.timestamp - user.lastTimeStamp) * PERICSE_FACTOR) / user.duration);
        // uint256 amountVesting = ((user.totalVestingAmount - user.TGEAmount) * remainTime) / PERICSE_FACTOR;

        uint256 amountVesting = (user.totalVestingAmount / dayDurationVesting) * claimTimes;  
        
        return (amountVesting, claimTimes);
    }

    //function updateVestingScheadule(uint _allocationType, uint256 _totalVestingAmount, uint128 _TGE, uint128 _startTime, uint128 _cliffDuration, uint128 _vestingDuration) external {}

    function _verifyVestingUser(
       address _user,
       uint _allocationType, 
       uint256 _totalVestingAmount, 
       uint128 _TGE, 
       uint128 _startTime, 
       uint128 _cliffDuration, 
       uint128 _vestingDuration,
       bytes32[] memory proof
    ) internal view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_user, _allocationType, _totalVestingAmount, _TGE, _startTime, _cliffDuration, _vestingDuration));

        return MerkleProof.verify(proof, root, leaf);
    }

    function getRemainVestingToken(address _token) public view returns(uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    function emergencyWithdraw(address _token) external onlyAdmin {
        uint256 balance = getRemainVestingToken(_token);

        IERC20(_token).transfer(msg.sender, balance);
    } 

    function viewBlock() external view returns(uint256) {
        return block.timestamp;
    }

    modifier onlyAdmin() {
        require(admin[msg.sender] == true, "Caller is not admin");
        _; 
    }   
}



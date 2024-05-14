// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/BaseMath.sol";
import "../Dependencies/SafeMath.sol";
import "../Dependencies/Ownable.sol";
import "../Dependencies/CheckContract.sol";
import "../Dependencies/console.sol";
import "../Interfaces/IANTMToken.sol";
import "../Interfaces/IANTMStaking.sol";
import "../Dependencies/LiquityMath.sol";
import "../Interfaces/IANTUSDToken.sol";

contract ANTMStaking is IANTMStaking, Ownable, CheckContract, BaseMath {
    using SafeMath for uint;

    // --- Data ---
    string constant public NAME = "ANTMStaking";

    mapping( address => uint) public stakes;
    uint public totalANTMStaked;

    uint public F_ETH;  // Running sum of ETH fees per-ANTM-staked
    uint public F_ANTUSD; // Running sum of ANTM fees per-ANTM-staked

    // User snapshots of F_ETH and F_ANTUSD, taken at the point at which their latest deposit was made
    mapping (address => Snapshot) public snapshots; 

    struct Snapshot {
        uint F_ETH_Snapshot;
        uint F_ANTUSD_Snapshot;
    }
    
    IANTMToken public antmToken;
    IANTUSDToken public antusdToken;

    address public troveManagerAddress;
    address public borrowerOperationsAddress;
    address public activePoolAddress;
    address public stETHAddress;

    // --- Events ---

    event ANTMTokenAddressSet(address _antmTokenAddress);
    event ANTUSDTokenAddressSet(address _antusdTokenAddress);
    event TroveManagerAddressSet(address _troveManager);
    event BorrowerOperationsAddressSet(address _borrowerOperationsAddress);
    event ActivePoolAddressSet(address _activePoolAddress);

    event StakeChanged(address indexed staker, uint newStake);
    event StakingGainsWithdrawn(address indexed staker, uint ANTUSDGain, uint ETHGain);
    event F_ETHUpdated(uint _F_ETH);
    event F_ANTUSDUpdated(uint _F_ANTUSD);
    event TotalANTMStakedUpdated(uint _totalANTMStaked);
    event EtherSent(address _account, uint _amount);
    event StakerSnapshotsUpdated(address _staker, uint _F_ETH, uint _F_ANTUSD);

    // --- Functions ---

    function setAddresses
    (
        address _antmTokenAddress,
        address _antusdTokenAddress,
        address _troveManagerAddress, 
        address _borrowerOperationsAddress,
        address _activePoolAddress,
        address _stETHAddress
    ) 
        external 
        onlyOwner 
        override 
    {
        checkContract(_antmTokenAddress);
        checkContract(_antusdTokenAddress);
        checkContract(_troveManagerAddress);
        checkContract(_borrowerOperationsAddress);
        checkContract(_activePoolAddress);
        checkContract(_stETHAddress);

        antmToken = IANTMToken(_antmTokenAddress);
        antusdToken = IANTUSDToken(_antusdTokenAddress);
        troveManagerAddress = _troveManagerAddress;
        borrowerOperationsAddress = _borrowerOperationsAddress;
        activePoolAddress = _activePoolAddress;
        stETHAddress = _stETHAddress;

        emit ANTMTokenAddressSet(_antmTokenAddress);
        emit ANTMTokenAddressSet(_antusdTokenAddress);
        emit TroveManagerAddressSet(_troveManagerAddress);
        emit BorrowerOperationsAddressSet(_borrowerOperationsAddress);
        emit ActivePoolAddressSet(_activePoolAddress);

        _renounceOwnership();
    }

    // If caller has a pre-existing stake, send any accumulated ETH and ANTUSD gains to them. 
    function stake(uint _ANTMamount) external override {
        _requireNonZeroAmount(_ANTMamount);

        uint currentStake = stakes[msg.sender];

        uint ETHGain;
        uint ANTUSDGain;
        // Grab any accumulated ETH and ANTUSD gains from the current stake
        if (currentStake != 0) {
            ETHGain = _getPendingETHGain(msg.sender);
            ANTUSDGain = _getPendingANTUSDGain(msg.sender);
        }
    
       _updateUserSnapshots(msg.sender);

        uint newStake = currentStake.add(_ANTMamount);

        // Increase user’s stake and total ANTM staked
        stakes[msg.sender] = newStake;
        totalANTMStaked = totalANTMStaked.add(_ANTMamount);
        emit TotalANTMStakedUpdated(totalANTMStaked);

        // Transfer ANTM from caller to this contract
        antmToken.sendToANTMStaking(msg.sender, _ANTMamount);

        emit StakeChanged(msg.sender, newStake);
        emit StakingGainsWithdrawn(msg.sender, ANTUSDGain, ETHGain);

         // Send accumulated ANTUSD and ETH gains to the caller
        if (currentStake != 0) {
            antusdToken.transfer(msg.sender, ANTUSDGain);
            _sendETHGainToUser(ETHGain);
        }
    }

    // Unstake the ANTM and send the it back to the caller, along with their accumulated ANTUSD & ETH gains. 
    // If requested amount > stake, send their entire stake.
    function unstake(uint _ANTMamount) external override {
        uint currentStake = stakes[msg.sender];
        _requireUserHasStake(currentStake);

        // Grab any accumulated ETH and ANTUSD gains from the current stake
        uint ETHGain = _getPendingETHGain(msg.sender);
        uint ANTUSDGain = _getPendingANTUSDGain(msg.sender);
        
        _updateUserSnapshots(msg.sender);

        if (_ANTMamount > 0) {
            uint ANTMToWithdraw = LiquityMath._min(_ANTMamount, currentStake);

            uint newStake = currentStake.sub(ANTMToWithdraw);

            // Decrease user's stake and total ANTM staked
            stakes[msg.sender] = newStake;
            totalANTMStaked = totalANTMStaked.sub(ANTMToWithdraw);
            emit TotalANTMStakedUpdated(totalANTMStaked);

            // Transfer unstaked ANTM to user
            antmToken.transfer(msg.sender, ANTMToWithdraw);

            emit StakeChanged(msg.sender, newStake);
        }

        emit StakingGainsWithdrawn(msg.sender, ANTUSDGain, ETHGain);

        // Send accumulated ANTUSD and ETH gains to the caller
        antusdToken.transfer(msg.sender, ANTUSDGain);
        _sendETHGainToUser(ETHGain);
    }

    // --- Reward-per-unit-staked increase functions. Called by Liquity core contracts ---

    function increaseF_ETH(uint _ETHFee) external override {
        _requireCallerIsTroveManager();
        uint ETHFeePerANTMStaked;
     
        if (totalANTMStaked > 0) {ETHFeePerANTMStaked = _ETHFee.mul(DECIMAL_PRECISION).div(totalANTMStaked);}

        F_ETH = F_ETH.add(ETHFeePerANTMStaked); 
        emit F_ETHUpdated(F_ETH);
    }

    function increaseF_ANTUSD(uint _ANTUSDFee) external override {
        _requireCallerIsBorrowerOperations();
        uint ANTUSDFeePerANTMStaked;
        
        if (totalANTMStaked > 0) {ANTUSDFeePerANTMStaked = _ANTUSDFee.mul(DECIMAL_PRECISION).div(totalANTMStaked);}
        
        F_ANTUSD = F_ANTUSD.add(ANTUSDFeePerANTMStaked);
        emit F_ANTUSDUpdated(F_ANTUSD);
    }

    // --- Pending reward functions ---

    function getPendingETHGain(address _user) external view override returns (uint) {
        return _getPendingETHGain(_user);
    }

    function _getPendingETHGain(address _user) internal view returns (uint) {
        uint F_ETH_Snapshot = snapshots[_user].F_ETH_Snapshot;
        uint ETHGain = stakes[_user].mul(F_ETH.sub(F_ETH_Snapshot)).div(DECIMAL_PRECISION);
        return ETHGain;
    }

    function getPendingANTUSDGain(address _user) external view override returns (uint) {
        return _getPendingANTUSDGain(_user);
    }

    function _getPendingANTUSDGain(address _user) internal view returns (uint) {
        uint F_ANTUSD_Snapshot = snapshots[_user].F_ANTUSD_Snapshot;
        uint ANTUSDGain = stakes[_user].mul(F_ANTUSD.sub(F_ANTUSD_Snapshot)).div(DECIMAL_PRECISION);
        return ANTUSDGain;
    }

    // --- Internal helper functions ---

    function _updateUserSnapshots(address _user) internal {
        snapshots[_user].F_ETH_Snapshot = F_ETH;
        snapshots[_user].F_ANTUSD_Snapshot = F_ANTUSD;
        emit StakerSnapshotsUpdated(_user, F_ETH, F_ANTUSD);
    }

    function _sendETHGainToUser(uint ETHGain) internal {
        emit EtherSent(msg.sender, ETHGain);
        IERC20(stETHAddress).transfer(msg.sender, ETHGain);
    }

    // --- 'require' functions ---

    function _requireCallerIsTroveManager() internal view {
        require(msg.sender == troveManagerAddress, "ANTMStaking: caller is not TroveM");
    }

    function _requireCallerIsBorrowerOperations() internal view {
        require(msg.sender == borrowerOperationsAddress, "ANTMStaking: caller is not BorrowerOps");
    }

     function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "ANTMStaking: caller is not ActivePool");
    }

    function _requireUserHasStake(uint currentStake) internal pure {  
        require(currentStake > 0, 'ANTMStaking: User must have a non-zero stake');  
    }

    function _requireNonZeroAmount(uint _amount) internal pure {
        require(_amount > 0, 'ANTMStaking: Amount must be non-zero');
    }

    receive() external payable {
        _requireCallerIsActivePool();
    }
}

// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface IANTMStaking {

    // --- Events --
    
    event ANTMTokenAddressSet(address _antmTokenAddress);
    event ANTUSDTokenAddressSet(address _lusdTokenAddress);
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
        address _lusdTokenAddress,
        address _troveManagerAddress, 
        address _borrowerOperationsAddress,
        address _activePoolAddress,
        address _stETHAddress
    )  external;

    function stake(uint _ANTMamount) external;

    function unstake(uint _ANTMamount) external;

    function increaseF_ETH(uint _ETHFee) external; 

    function increaseF_ANTUSD(uint _ANTMFee) external;  

    function getPendingETHGain(address _user) external view returns (uint);

    function getPendingANTUSDGain(address _user) external view returns (uint);
}

// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

// Common interface for the Trove Manager.
interface IBorrowerOperations {

    // --- Events ---

    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event ActivePoolAddressChanged(address _activePoolAddress);
    event DefaultPoolAddressChanged(address _defaultPoolAddress);
    event StabilityPoolAddressChanged(address _stabilityPoolAddress);
    event GasPoolAddressChanged(address _gasPoolAddress);
    event CollSurplusPoolAddressChanged(address _collSurplusPoolAddress);
    event PriceFeedAddressChanged(address  _newPriceFeedAddress);
    event SortedTrovesAddressChanged(address _sortedTrovesAddress);
    event ANTUSDTokenAddressChanged(address _lusdTokenAddress);
    event ANTMStakingAddressChanged(address _antmStakingAddress);

    event TroveCreated(address indexed _borrower, uint arrayIndex);
    event TroveUpdated(address indexed _borrower, uint _debt, uint _coll, uint stake, uint8 operation);
    event ANTUSDBorrowingFeePaid(address indexed _borrower, uint _ANTUSDFee);

    // --- Functions ---

    function setAddresses(
        address _troveManagerAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _priceFeedAddress,
        address _sortedTrovesAddress,
        address _lusdTokenAddress,
        address _antmStakingAddress,
        address _stETHAddress
    ) external;

    function openTrove(uint _maxFee, uint _ANTUSDAmount, address _upperHint, address _lowerHint, uint amount) external;

    function addColl(address _upperHint, address _lowerHint, uint amount) external;

    function moveETHGainToTrove(address _user, address _upperHint, address _lowerHint, uint amount) external;

    function withdrawColl(uint _amount, address _upperHint, address _lowerHint) external;

    function withdrawANTUSD(uint _maxFee, uint _amount, address _upperHint, address _lowerHint) external;

    function repayANTUSD(uint _amount, address _upperHint, address _lowerHint) external;

    function closeTrove() external;

    function adjustTrove(uint _maxFee, uint _collWithdrawal, uint _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint, uint amount) external;

    function claimCollateral() external;

    function getCompositeDebt(uint _debt) external pure returns (uint);
}

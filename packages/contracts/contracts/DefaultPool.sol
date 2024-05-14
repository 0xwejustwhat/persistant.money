// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import './Interfaces/IDefaultPool.sol';
import './Interfaces/IActivePool.sol';
import "./Dependencies/SafeMath.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";
import "./Dependencies/IERC20.sol";

/*
 * The Default Pool holds the ETH and ANTUSD debt (but not ANTUSD tokens) from liquidations that have been redistributed
 * to active troves but not yet "applied", i.e. not yet recorded on a recipient active trove's struct.
 *
 * When a trove makes an operation that applies its pending ETH and ANTUSD debt, its pending ETH and ANTUSD debt is moved
 * from the Default Pool to the Active Pool.
 */
contract DefaultPool is Ownable, CheckContract, IDefaultPool {
    using SafeMath for uint256;

    string constant public NAME = "DefaultPool";

    address public troveManagerAddress;
    address public activePoolAddress;
    address public stETHAddress;
    address public rewardPoolAddress;
    uint256 internal ETH;  // deposited ETH tracker
    uint256 internal Debt;  // debt

    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event DefaultPoolDebtUpdated(uint _Debt);
    event DefaultPoolETHBalanceUpdated(uint _ETH);

    // --- Dependency setters ---

    function setAddresses(
        address _troveManagerAddress,
        address _activePoolAddress,
        address _stETHAddress, 
        address _rewardPoolAddress
    )
        external
        onlyOwner
    {
        checkContract(_troveManagerAddress);
        checkContract(_activePoolAddress);
        checkContract(_stETHAddress);


        troveManagerAddress = _troveManagerAddress;
        activePoolAddress = _activePoolAddress;
        stETHAddress = _stETHAddress;
        rewardPoolAddress = _rewardPoolAddress;

        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);

        _renounceOwnership();
    }

    // --- Getters for public variables. Required by IPool interface ---

    /*
    * Returns the ETH state variable.
    *
    * Not necessarily equal to the the contract's raw ETH balance - ether can be forcibly sent to contracts.
    */
    function getETH() external view override returns (uint) {
        return ETH;
    }

    function getANTUSDDebt() external view override returns (uint) {
        return Debt;
    }

    // --- Pool functionality ---

    function sendETHToActivePool(uint _amount) external override {
        _requireCallerIsTroveManager();
        address activePool = activePoolAddress; // cache to save an SLOAD
        ETH = ETH.sub(_amount);
        emit DefaultPoolETHBalanceUpdated(ETH);
        emit EtherSent(activePool, _amount);

        IERC20(stETHAddress).transfer(activePool, _amount);
        IActivePool(activePool).addETH(_amount);
    }

    function increaseANTUSDDebt(uint _amount) external override {
        _requireCallerIsTroveManager();
        Debt = Debt.add(_amount);
        emit DefaultPoolDebtUpdated(Debt);
    }

    function decreaseANTUSDDebt(uint _amount) external override {
        _requireCallerIsTroveManager();
        Debt = Debt.sub(_amount);
        emit DefaultPoolDebtUpdated(Debt);
    }

    // --- 'require' functions ---

    function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "DefaultPool: Caller is not the ActivePool");
    }

    function _requireCallerIsTroveManager() internal view {
        require(msg.sender == troveManagerAddress, "DefaultPool: Caller is not the TroveManager");
    }

    // --- Fallback function ---

    function addETH(uint amount) external override{
        _requireCallerIsActivePool();
        ETH = ETH.add(amount);
        emit DefaultPoolETHBalanceUpdated(ETH);
    }

    function withdrawReward() external {
        uint reward = IERC20(stETHAddress).balanceOf(address(this)) - ETH;
        IERC20(stETHAddress).transfer(rewardPoolAddress, reward); 
    }
}

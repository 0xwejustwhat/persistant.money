// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/CheckContract.sol";
import "../Dependencies/IERC20.sol";
import "../Dependencies/console.sol";
import "../Interfaces/IBorrowerOperations.sol";


contract BorrowerOperationsScript is CheckContract {
    IBorrowerOperations immutable borrowerOperations;
    address immutable stETHAddress;

    constructor(IBorrowerOperations _borrowerOperations, address _stETHAddress) public {
        checkContract(address(_borrowerOperations));
        checkContract(_stETHAddress);
        borrowerOperations = _borrowerOperations;
        stETHAddress = _stETHAddress;
    }

    function openTrove(uint _maxFee, uint _ANTUSDAmount, address _upperHint, address _lowerHint, uint amount) external {
        IERC20(stETHAddress).transferFrom(msg.sender, address(this), amount);
        IERC20(stETHAddress).approve(address(borrowerOperations), amount);
        borrowerOperations.openTrove(_maxFee, _ANTUSDAmount, _upperHint, _lowerHint, amount);
    }

    function addColl(address _upperHint, address _lowerHint, uint amount) external {
        IERC20(stETHAddress).transferFrom(msg.sender, address(this), amount);
        IERC20(stETHAddress).approve(address(borrowerOperations), amount);
        borrowerOperations.addColl(_upperHint, _lowerHint, amount);
    }

    function withdrawColl(uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawColl(_amount, _upperHint, _lowerHint);
    }

    function withdrawANTUSD(uint _maxFee, uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawANTUSD(_maxFee, _amount, _upperHint, _lowerHint);
    }

    function repayANTUSD(uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.repayANTUSD(_amount, _upperHint, _lowerHint);
    }

    function closeTrove() external {
        borrowerOperations.closeTrove();
    }

    function adjustTrove(uint _maxFee, uint _collWithdrawal, uint _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint, uint amount) external {
        IERC20(stETHAddress).transferFrom(msg.sender, address(this), amount);
        IERC20(stETHAddress).approve(address(borrowerOperations), amount);
        borrowerOperations.adjustTrove(_maxFee, _collWithdrawal, _debtChange, isDebtIncrease, _upperHint, _lowerHint, amount);
    }

    function claimCollateral() external {
        borrowerOperations.claimCollateral();
    }
}

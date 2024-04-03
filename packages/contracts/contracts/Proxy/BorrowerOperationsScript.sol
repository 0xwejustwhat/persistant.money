// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/CheckContract.sol";
import "../Dependencies/IERC20.sol";
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

    function openTrove(uint _maxFee, uint _LUSDAmount, address _upperHint, address _lowerHint, uint amount) external {
        IERC20(stETHAddress).transferFrom(msg.sender, address(this), amount);
        borrowerOperations.openTrove(_maxFee, _LUSDAmount, _upperHint, _lowerHint, amount);
    }

    function addColl(address _upperHint, address _lowerHint, uint amount) external {
        IERC20(stETHAddress).transferFrom(msg.sender, address(this), amount);
        borrowerOperations.addColl(_upperHint, _lowerHint, amount);
    }

    function withdrawColl(uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawColl(_amount, _upperHint, _lowerHint);
    }

    function withdrawLUSD(uint _maxFee, uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawLUSD(_maxFee, _amount, _upperHint, _lowerHint);
    }

    function repayLUSD(uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.repayLUSD(_amount, _upperHint, _lowerHint);
    }

    function closeTrove() external {
        borrowerOperations.closeTrove();
    }

    function adjustTrove(uint _maxFee, uint _collWithdrawal, uint _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint, uint amount) external {
        IERC20(stETHAddress).transferFrom(msg.sender, address(this), amount);
        borrowerOperations.adjustTrove(_maxFee, _collWithdrawal, _debtChange, isDebtIncrease, _upperHint, _lowerHint, amount);
    }

    function claimCollateral() external {
        borrowerOperations.claimCollateral();
    }
}

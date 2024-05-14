// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/SafeMath.sol";
import "../Dependencies/LiquityMath.sol";
import "../Dependencies/IERC20.sol";
import "../Interfaces/IBorrowerOperations.sol";
import "../Interfaces/ITroveManager.sol";
import "../Interfaces/IStabilityPool.sol";
import "../Interfaces/IPriceFeed.sol";
import "../Interfaces/ILQTYStaking.sol";
import "./BorrowerOperationsScript.sol";
import "./ETHTransferScript.sol";
import "./LQTYStakingScript.sol";
import "../Dependencies/console.sol";


contract BorrowerWrappersScript is BorrowerOperationsScript, ETHTransferScript, LQTYStakingScript {
    using SafeMath for uint;

    string constant public NAME = "BorrowerWrappersScript";

    ITroveManager immutable troveManager;
    IStabilityPool immutable stabilityPool;
    IPriceFeed immutable priceFeed;
    IERC20 immutable antusdToken;
    IERC20 immutable lqtyToken;
    ILQTYStaking immutable lqtyStaking;

    constructor(
        address _borrowerOperationsAddress,
        address _stETHAddress,
        address _troveManagerAddress,
        address _lqtyStakingAddress
    )
        BorrowerOperationsScript(IBorrowerOperations(_borrowerOperationsAddress), _stETHAddress)
        ETHTransferScript(_stETHAddress)
        LQTYStakingScript(_lqtyStakingAddress)
        public
    {
        checkContract(_troveManagerAddress);
        ITroveManager troveManagerCached = ITroveManager(_troveManagerAddress);
        troveManager = troveManagerCached;

        IStabilityPool stabilityPoolCached = troveManagerCached.stabilityPool();
        checkContract(address(stabilityPoolCached));
        stabilityPool = stabilityPoolCached;

        IPriceFeed priceFeedCached = troveManagerCached.priceFeed();
        checkContract(address(priceFeedCached));
        priceFeed = priceFeedCached;

        address antusdTokenCached = address(troveManagerCached.antusdToken());
        checkContract(antusdTokenCached);
        antusdToken = IERC20(antusdTokenCached);

        address lqtyTokenCached = address(troveManagerCached.lqtyToken());
        checkContract(lqtyTokenCached);
        lqtyToken = IERC20(lqtyTokenCached);

        ILQTYStaking lqtyStakingCached = troveManagerCached.lqtyStaking();
        require(_lqtyStakingAddress == address(lqtyStakingCached), "BorrowerWrappersScript: Wrong LQTYStaking address");
        lqtyStaking = lqtyStakingCached;
    }

    function claimCollateralAndOpenTrove(uint _maxFee, uint _ANTUSDAmount, address _upperHint, address _lowerHint, uint amount) external {

        IERC20(stETHAddress).transferFrom(msg.sender, address(this), amount);

        IERC20(stETHAddress).approve(address(borrowerOperations), amount);

        uint balanceBefore = IERC20(stETHAddress).balanceOf(address(this));

        // Claim collateral
        borrowerOperations.claimCollateral();


        uint balanceAfter = IERC20(stETHAddress).balanceOf(address(this));

        // already checked in CollSurplusPool
        assert(balanceAfter > balanceBefore);

        uint totalCollateral = balanceAfter.sub(balanceBefore).add(amount);

        // Open trove with obtained collateral, plus collateral sent by user
        borrowerOperations.openTrove(_maxFee, _ANTUSDAmount, _upperHint, _lowerHint, totalCollateral);
    }

    function claimSPRewardsAndRecycle(uint _maxFee, address _upperHint, address _lowerHint) external {
        uint collBalanceBefore = IERC20(stETHAddress).balanceOf(address(this));
        uint lqtyBalanceBefore = lqtyToken.balanceOf(address(this));

        // Claim rewards
        stabilityPool.withdrawFromSP(0);

        uint collBalanceAfter = IERC20(stETHAddress).balanceOf(address(this));
        uint lqtyBalanceAfter = lqtyToken.balanceOf(address(this));
        uint claimedCollateral = collBalanceAfter.sub(collBalanceBefore);

        // Add claimed ETH to trove, get more ANTUSD and stake it into the Stability Pool
        if (claimedCollateral > 0) {
            _requireUserHasTrove(address(this));
            uint ANTUSDAmount = _getNetANTUSDAmount(claimedCollateral);
            borrowerOperations.adjustTrove(_maxFee, 0, ANTUSDAmount, true, _upperHint, _lowerHint, claimedCollateral);
            // Provide withdrawn ANTUSD to Stability Pool
            if (ANTUSDAmount > 0) {
                stabilityPool.provideToSP(ANTUSDAmount, address(0));
            }
        }

        // Stake claimed LQTY
        uint claimedLQTY = lqtyBalanceAfter.sub(lqtyBalanceBefore);
        if (claimedLQTY > 0) {
            lqtyStaking.stake(claimedLQTY);
        }
    }

    function claimStakingGainsAndRecycle(uint _maxFee, address _upperHint, address _lowerHint) external {
        uint collBalanceBefore = IERC20(stETHAddress).balanceOf(address(this));
        uint antusdBalanceBefore = antusdToken.balanceOf(address(this));
        uint lqtyBalanceBefore = lqtyToken.balanceOf(address(this));

        // Claim gains
        lqtyStaking.unstake(0);

        uint gainedCollateral = IERC20(stETHAddress).balanceOf(address(this)).sub(collBalanceBefore); // stack too deep issues :'(
        uint gainedANTUSD = antusdToken.balanceOf(address(this)).sub(antusdBalanceBefore);

        uint netANTUSDAmount;
        // Top up trove and get more ANTUSD, keeping ICR constant
        if (gainedCollateral > 0) {
            _requireUserHasTrove(address(this));
            netANTUSDAmount = _getNetANTUSDAmount(gainedCollateral);
            IERC20(stETHAddress).approve(address(borrowerOperations), gainedCollateral);
            borrowerOperations.adjustTrove(_maxFee, 0, netANTUSDAmount, true, _upperHint, _lowerHint, gainedCollateral);
        }

        uint totalANTUSD = gainedANTUSD.add(netANTUSDAmount);
        if (totalANTUSD > 0) {
            stabilityPool.provideToSP(totalANTUSD, address(0));

            // Providing to Stability Pool also triggers LQTY claim, so stake it if any
            uint lqtyBalanceAfter = lqtyToken.balanceOf(address(this));
            uint claimedLQTY = lqtyBalanceAfter.sub(lqtyBalanceBefore);
            if (claimedLQTY > 0) {
                lqtyStaking.stake(claimedLQTY);
            }
        }

    }

    function _getNetANTUSDAmount(uint _collateral) internal returns (uint) {
        uint price = priceFeed.fetchPrice();
        uint ICR = troveManager.getCurrentICR(address(this), price);

        uint ANTUSDAmount = _collateral.mul(price).div(ICR);
        uint borrowingRate = troveManager.getBorrowingRateWithDecay();
        uint netDebt = ANTUSDAmount.mul(LiquityMath.DECIMAL_PRECISION).div(LiquityMath.DECIMAL_PRECISION.add(borrowingRate));

        return netDebt;
    }

    function _requireUserHasTrove(address _depositor) internal view {
        require(troveManager.getTroveStatus(_depositor) == 1, "BorrowerWrappersScript: caller must have an active trove");
    }
}

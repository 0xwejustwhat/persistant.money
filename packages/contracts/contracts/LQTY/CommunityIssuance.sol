// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/IANTMToken.sol";
import "../Interfaces/ICommunityIssuance.sol";
import "../Dependencies/BaseMath.sol";
import "../Dependencies/LiquityMath.sol";
import "../Dependencies/Ownable.sol";
import "../Dependencies/CheckContract.sol";
import "../Dependencies/SafeMath.sol";


contract CommunityIssuance is ICommunityIssuance, Ownable, CheckContract, BaseMath {
    using SafeMath for uint;

    // --- Data ---

    string constant public NAME = "CommunityIssuance";

    uint constant public SECONDS_IN_ONE_MINUTE = 60;

   /* The issuance factor F determines the curvature of the issuance curve.
    *
    * Minutes in one year: 60*24*365 = 525600
    *
    * For 50% of remaining tokens issued each year, with minutes as time units, we have:
    * 
    * F ** 525600 = 0.5
    * 
    * Re-arranging:
    * 
    * 525600 * ln(F) = ln(0.5)
    * F = 0.5 ** (1/525600)
    * F = 0.999998681227695000 
    */
    uint constant public ISSUANCE_FACTOR = 999998681227695000;

    /* 
    * The community ANTM supply cap is the starting balance of the Community Issuance contract.
    * It should be minted to this contract by ANTMToken, when the token is deployed.
    * 
    * Set to 32M (slightly less than 1/3) of total ANTM supply.
    */
    uint constant public ANTMSupplyCap = 32e24; // 32 million

    IANTMToken public antmToken;

    address public stabilityPoolAddress;

    uint public totalANTMIssued;
    uint public immutable deploymentTime;

    // --- Events ---

    event ANTMTokenAddressSet(address _antmTokenAddress);
    event StabilityPoolAddressSet(address _stabilityPoolAddress);
    event TotalANTMIssuedUpdated(uint _totalANTMIssued);

    // --- Functions ---

    constructor() public {
        deploymentTime = block.timestamp;
    }

    function setAddresses
    (
        address _antmTokenAddress, 
        address _stabilityPoolAddress
    ) 
        external 
        onlyOwner 
        override 
    {
        checkContract(_antmTokenAddress);
        checkContract(_stabilityPoolAddress);

        antmToken = IANTMToken(_antmTokenAddress);
        stabilityPoolAddress = _stabilityPoolAddress;

        // When ANTMToken deployed, it should have transferred CommunityIssuance's ANTM entitlement
        uint ANTMBalance = antmToken.balanceOf(address(this));
        assert(ANTMBalance >= ANTMSupplyCap);

        emit ANTMTokenAddressSet(_antmTokenAddress);
        emit StabilityPoolAddressSet(_stabilityPoolAddress);

        _renounceOwnership();
    }

    function issueANTM() external override returns (uint) {
        _requireCallerIsStabilityPool();

        uint latestTotalANTMIssued = ANTMSupplyCap.mul(_getCumulativeIssuanceFraction()).div(DECIMAL_PRECISION);
        uint issuance = latestTotalANTMIssued.sub(totalANTMIssued);

        totalANTMIssued = latestTotalANTMIssued;
        emit TotalANTMIssuedUpdated(latestTotalANTMIssued);
        
        return issuance;
    }

    /* Gets 1-f^t    where: f < 1

    f: issuance factor that determines the shape of the curve
    t:  time passed since last ANTM issuance event  */
    function _getCumulativeIssuanceFraction() internal view returns (uint) {
        // Get the time passed since deployment
        uint timePassedInMinutes = block.timestamp.sub(deploymentTime).div(SECONDS_IN_ONE_MINUTE);

        // f^t
        uint power = LiquityMath._decPow(ISSUANCE_FACTOR, timePassedInMinutes);

        //  (1 - f^t)
        uint cumulativeIssuanceFraction = (uint(DECIMAL_PRECISION).sub(power));
        assert(cumulativeIssuanceFraction <= DECIMAL_PRECISION); // must be in range [0,1]

        return cumulativeIssuanceFraction;
    }

    function sendANTM(address _account, uint _ANTMamount) external override {
        _requireCallerIsStabilityPool();

        antmToken.transfer(_account, _ANTMamount);
    }

    // --- 'require' functions ---

    function _requireCallerIsStabilityPool() internal view {
        require(msg.sender == stabilityPoolAddress, "CommunityIssuance: caller is not SP");
    }
}

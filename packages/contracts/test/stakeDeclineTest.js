const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")
const stETHAllocator = require("../utils/AllocateSTETH.js")
const TroveManagerTester = artifacts.require("./TroveManagerTester.sol")
const ANTUSDTokenTester = artifacts.require("./ANTUSDTokenTester.sol")

const th = testHelpers.TestHelper
const allocator = stETHAllocator.Allocator
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const mv = testHelpers.MoneyValues
const timeValues = testHelpers.TimeValues


/* NOTE: Some tests involving ETH redemption fees do not test for specific fee values.
 * Some only test that the fees are non-zero when they should occur.
 *
 * Specific ETH gain values will depend on the final fee schedule used, and the final choices for
 * the parameter BETA in the TroveManager, which is still TBD based on economic modelling.
 * 
 */
contract('TroveManager', async accounts => {

  const ZERO_ADDRESS = th.ZERO_ADDRESS
  const [owner, A, B, C, D, E, F] = accounts.slice(0, 7);

  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000)

  let priceFeed
  let antusdToken
  let sortedTroves
  let troveManager
  let activePool
  let stabilityPool
  let collSurplusPool
  let defaultPool
  let borrowerOperations
  let hintHelpers

  let contracts

  const getOpenTroveANTUSDAmount = async (totalDebt) => th.getOpenTroveANTUSDAmount(contracts, totalDebt)
 
  const getSnapshotsRatio = async () => {
    const ratio = (await troveManager.totalStakesSnapshot())
      .mul(toBN(dec(1, 18)))
      .div((await troveManager.totalCollateralSnapshot()))

    return ratio
  }

  beforeEach(async () => {
    contracts = await deploymentHelper.deployLiquityCore()
    contracts.troveManager = await TroveManagerTester.new()
    contracts.antusdToken = await ANTUSDTokenTester.new(
      contracts.troveManager.address,
      contracts.stabilityPool.address,
      contracts.borrowerOperations.address
    )
    const ANTMContracts = await deploymentHelper.deployANTMContracts(bountyAddress, lpRewardsAddress, multisig)

    await allocator.allocate(contracts, accounts.slice(0, 30))

    priceFeed = contracts.priceFeedTestnet
    antusdToken = contracts.antusdToken
    sortedTroves = contracts.sortedTroves
    troveManager = contracts.troveManager
    activePool = contracts.activePool
    stabilityPool = contracts.stabilityPool
    defaultPool = contracts.defaultPool
    collSurplusPool = contracts.collSurplusPool
    borrowerOperations = contracts.borrowerOperations
    hintHelpers = contracts.hintHelpers

    antmStaking = ANTMContracts.antmStaking
    antmToken = ANTMContracts.antmToken
    communityIssuance = ANTMContracts.communityIssuance
    lockupContractFactory = ANTMContracts.lockupContractFactory

    await deploymentHelper.connectCoreContracts(contracts, ANTMContracts)
    await deploymentHelper.connectANTMContracts(ANTMContracts)
    await deploymentHelper.connectANTMContractsToCore(ANTMContracts, contracts)
  })

  it("A given trove's stake decline is negligible with adjustments and tiny liquidations", async () => {
    await priceFeed.setPrice(dec(100, 18))
  
    // Make 1 mega troves A at ~50% total collateral
    await borrowerOperations.openTrove(th._100pct, await getOpenTroveANTUSDAmount(dec(1, 31)), ZERO_ADDRESS, ZERO_ADDRESS, dec(2, 29), { from: A })
    
    // Make 5 large troves B, C, D, E, F at ~10% total collateral
    await borrowerOperations.openTrove(th._100pct, await getOpenTroveANTUSDAmount(dec(2, 30)), ZERO_ADDRESS, ZERO_ADDRESS, dec(4, 28), { from: B })
    await borrowerOperations.openTrove(th._100pct, await getOpenTroveANTUSDAmount(dec(2, 30)), ZERO_ADDRESS, ZERO_ADDRESS, dec(4, 28), { from: C })
    await borrowerOperations.openTrove(th._100pct, await getOpenTroveANTUSDAmount(dec(2, 30)), ZERO_ADDRESS, ZERO_ADDRESS, dec(4, 28), { from: D })
    await borrowerOperations.openTrove(th._100pct, await getOpenTroveANTUSDAmount(dec(2, 30)), ZERO_ADDRESS, ZERO_ADDRESS, dec(4, 28), { from: E })
    await borrowerOperations.openTrove(th._100pct, await getOpenTroveANTUSDAmount(dec(2, 30)), ZERO_ADDRESS, ZERO_ADDRESS, dec(4, 28), { from: F })
  
    // Make 10 tiny troves at relatively negligible collateral (~1e-9 of total)
    const tinyTroves = accounts.slice(10, 20)
    for (account of tinyTroves) {
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveANTUSDAmount(dec(1, 22)), ZERO_ADDRESS, ZERO_ADDRESS, dec(2, 20), { from: account })
    }

    // liquidate 1 trove at ~50% total system collateral
    await priceFeed.setPrice(dec(50, 18))
    assert.isTrue(await troveManager.checkRecoveryMode(await priceFeed.getPrice()))
    await troveManager.liquidate(A)

    console.log(`totalStakesSnapshot after L1: ${await troveManager.totalStakesSnapshot()}`)
    console.log(`totalCollateralSnapshot after L1: ${await troveManager.totalCollateralSnapshot()}`)
    console.log(`Snapshots ratio after L1: ${await getSnapshotsRatio()}`)
    console.log(`B pending ETH reward after L1: ${await troveManager.getPendingETHReward(B)}`)
    console.log(`B stake after L1: ${(await troveManager.Troves(B))[2]}`)

    // adjust trove B 1 wei: apply rewards
    await borrowerOperations.adjustTrove(th._100pct, 0, 1, false, ZERO_ADDRESS, ZERO_ADDRESS, 0, {from: B})  // B repays 1 wei
    console.log(`B stake after A1: ${(await troveManager.Troves(B))[2]}`)
    console.log(`Snapshots ratio after A1: ${await getSnapshotsRatio()}`)

    // Loop over tiny troves, and alternately:
    // - Liquidate a tiny trove
    // - Adjust B's collateral by 1 wei
    for (let [idx, trove] of tinyTroves.entries()) {
      await troveManager.liquidate(trove)
      console.log(`B stake after L${idx + 2}: ${(await troveManager.Troves(B))[2]}`)
      console.log(`Snapshots ratio after L${idx + 2}: ${await getSnapshotsRatio()}`)
      await borrowerOperations.adjustTrove(th._100pct, 0, 1, false, ZERO_ADDRESS, ZERO_ADDRESS, 0, {from: B})  // A repays 1 wei
      console.log(`B stake after A${idx + 2}: ${(await troveManager.Troves(B))[2]}`)
    }
  })

  // TODO: stake decline for adjustments with sizable liquidations, for comparison
})
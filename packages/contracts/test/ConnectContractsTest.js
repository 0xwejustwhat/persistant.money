const deploymentHelper = require("../utils/deploymentHelpers.js")

contract('Deployment script - Sets correct contract addresses dependencies after deployment', async accounts => {
  const [owner] = accounts;

  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000)
  
  let priceFeed
  let antusdToken
  let sortedTroves
  let troveManager
  let activePool
  let stabilityPool
  let defaultPool
  let functionCaller
  let borrowerOperations
  let antmStaking
  let antmToken
  let communityIssuance
  let lockupContractFactory

  before(async () => {
    const coreContracts = await deploymentHelper.deployLiquityCore()
    const ANTMContracts = await deploymentHelper.deployANTMContracts(bountyAddress, lpRewardsAddress, multisig)

    priceFeed = coreContracts.priceFeedTestnet
    antusdToken = coreContracts.antusdToken
    sortedTroves = coreContracts.sortedTroves
    troveManager = coreContracts.troveManager
    activePool = coreContracts.activePool
    stabilityPool = coreContracts.stabilityPool
    defaultPool = coreContracts.defaultPool
    functionCaller = coreContracts.functionCaller
    borrowerOperations = coreContracts.borrowerOperations

    antmStaking = ANTMContracts.antmStaking
    antmToken = ANTMContracts.antmToken
    communityIssuance = ANTMContracts.communityIssuance
    lockupContractFactory = ANTMContracts.lockupContractFactory

    await deploymentHelper.connectANTMContracts(ANTMContracts)
    await deploymentHelper.connectCoreContracts(coreContracts, ANTMContracts)
    await deploymentHelper.connectANTMContractsToCore(ANTMContracts, coreContracts)
  })

  it('Sets the correct PriceFeed address in TroveManager', async () => {
    const priceFeedAddress = priceFeed.address

    const recordedPriceFeedAddress = await troveManager.priceFeed()

    assert.equal(priceFeedAddress, recordedPriceFeedAddress)
  })

  it('Sets the correct ANTUSDToken address in TroveManager', async () => {
    const antusdTokenAddress = antusdToken.address

    const recordedClvTokenAddress = await troveManager.antusdToken()

    assert.equal(antusdTokenAddress, recordedClvTokenAddress)
  })

  it('Sets the correct SortedTroves address in TroveManager', async () => {
    const sortedTrovesAddress = sortedTroves.address

    const recordedSortedTrovesAddress = await troveManager.sortedTroves()

    assert.equal(sortedTrovesAddress, recordedSortedTrovesAddress)
  })

  it('Sets the correct BorrowerOperations address in TroveManager', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await troveManager.borrowerOperationsAddress()

    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  // ActivePool in TroveM
  it('Sets the correct ActivePool address in TroveManager', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddresss = await troveManager.activePool()

    assert.equal(activePoolAddress, recordedActivePoolAddresss)
  })

  // DefaultPool in TroveM
  it('Sets the correct DefaultPool address in TroveManager', async () => {
    const defaultPoolAddress = defaultPool.address

    const recordedDefaultPoolAddresss = await troveManager.defaultPool()

    assert.equal(defaultPoolAddress, recordedDefaultPoolAddresss)
  })

  // StabilityPool in TroveM
  it('Sets the correct StabilityPool address in TroveManager', async () => {
    const stabilityPoolAddress = stabilityPool.address

    const recordedStabilityPoolAddresss = await troveManager.stabilityPool()

    assert.equal(stabilityPoolAddress, recordedStabilityPoolAddresss)
  })

  // ANTM Staking in TroveM
  it('Sets the correct ANTMStaking address in TroveManager', async () => {
    const antmStakingAddress = antmStaking.address

    const recordedANTMStakingAddress = await troveManager.antmStaking()
    assert.equal(antmStakingAddress, recordedANTMStakingAddress)
  })

  // Active Pool

  it('Sets the correct StabilityPool address in ActivePool', async () => {
    const stabilityPoolAddress = stabilityPool.address

    const recordedStabilityPoolAddress = await activePool.stabilityPoolAddress()

    assert.equal(stabilityPoolAddress, recordedStabilityPoolAddress)
  })

  it('Sets the correct DefaultPool address in ActivePool', async () => {
    const defaultPoolAddress = defaultPool.address

    const recordedDefaultPoolAddress = await activePool.defaultPoolAddress()

    assert.equal(defaultPoolAddress, recordedDefaultPoolAddress)
  })

  it('Sets the correct BorrowerOperations address in ActivePool', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await activePool.borrowerOperationsAddress()

    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  it('Sets the correct TroveManager address in ActivePool', async () => {
    const troveManagerAddress = troveManager.address

    const recordedTroveManagerAddress = await activePool.troveManagerAddress()
    assert.equal(troveManagerAddress, recordedTroveManagerAddress)
  })

  // Stability Pool

  it('Sets the correct ActivePool address in StabilityPool', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await stabilityPool.activePool()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  it('Sets the correct BorrowerOperations address in StabilityPool', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await stabilityPool.borrowerOperations()

    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  it('Sets the correct ANTUSDToken address in StabilityPool', async () => {
    const antusdTokenAddress = antusdToken.address

    const recordedClvTokenAddress = await stabilityPool.antusdToken()

    assert.equal(antusdTokenAddress, recordedClvTokenAddress)
  })

  it('Sets the correct TroveManager address in StabilityPool', async () => {
    const troveManagerAddress = troveManager.address

    const recordedTroveManagerAddress = await stabilityPool.troveManager()
    assert.equal(troveManagerAddress, recordedTroveManagerAddress)
  })

  // Default Pool

  it('Sets the correct TroveManager address in DefaultPool', async () => {
    const troveManagerAddress = troveManager.address

    const recordedTroveManagerAddress = await defaultPool.troveManagerAddress()
    assert.equal(troveManagerAddress, recordedTroveManagerAddress)
  })

  it('Sets the correct ActivePool address in DefaultPool', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await defaultPool.activePoolAddress()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  it('Sets the correct TroveManager address in SortedTroves', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await sortedTroves.borrowerOperationsAddress()
    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  it('Sets the correct BorrowerOperations address in SortedTroves', async () => {
    const troveManagerAddress = troveManager.address

    const recordedTroveManagerAddress = await sortedTroves.troveManager()
    assert.equal(troveManagerAddress, recordedTroveManagerAddress)
  })

  //--- BorrowerOperations ---

  // TroveManager in BO
  it('Sets the correct TroveManager address in BorrowerOperations', async () => {
    const troveManagerAddress = troveManager.address

    const recordedTroveManagerAddress = await borrowerOperations.troveManager()
    assert.equal(troveManagerAddress, recordedTroveManagerAddress)
  })

  // setPriceFeed in BO
  it('Sets the correct PriceFeed address in BorrowerOperations', async () => {
    const priceFeedAddress = priceFeed.address

    const recordedPriceFeedAddress = await borrowerOperations.priceFeed()
    assert.equal(priceFeedAddress, recordedPriceFeedAddress)
  })

  // setSortedTroves in BO
  it('Sets the correct SortedTroves address in BorrowerOperations', async () => {
    const sortedTrovesAddress = sortedTroves.address

    const recordedSortedTrovesAddress = await borrowerOperations.sortedTroves()
    assert.equal(sortedTrovesAddress, recordedSortedTrovesAddress)
  })

  // setActivePool in BO
  it('Sets the correct ActivePool address in BorrowerOperations', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await borrowerOperations.activePool()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  // setDefaultPool in BO
  it('Sets the correct DefaultPool address in BorrowerOperations', async () => {
    const defaultPoolAddress = defaultPool.address

    const recordedDefaultPoolAddress = await borrowerOperations.defaultPool()
    assert.equal(defaultPoolAddress, recordedDefaultPoolAddress)
  })

  // ANTM Staking in BO
  it('Sets the correct ANTMStaking address in BorrowerOperations', async () => {
    const antmStakingAddress = antmStaking.address

    const recordedANTMStakingAddress = await borrowerOperations.antmStakingAddress()
    assert.equal(antmStakingAddress, recordedANTMStakingAddress)
  })


  // --- ANTM Staking ---

  // Sets ANTMToken in ANTMStaking
  it('Sets the correct ANTMToken address in ANTMStaking', async () => {
    const antmTokenAddress = antmToken.address

    const recordedANTMTokenAddress = await antmStaking.antmToken()
    assert.equal(antmTokenAddress, recordedANTMTokenAddress)
  })

  // Sets ActivePool in ANTMStaking
  it('Sets the correct ActivePool address in ANTMStaking', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await antmStaking.activePoolAddress()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  // Sets ANTUSDToken in ANTMStaking
  it('Sets the correct ActivePool address in ANTMStaking', async () => {
    const antusdTokenAddress = antusdToken.address

    const recordedANTUSDTokenAddress = await antmStaking.antusdToken()
    assert.equal(antusdTokenAddress, recordedANTUSDTokenAddress)
  })

  // Sets TroveManager in ANTMStaking
  it('Sets the correct ActivePool address in ANTMStaking', async () => {
    const troveManagerAddress = troveManager.address

    const recordedTroveManagerAddress = await antmStaking.troveManagerAddress()
    assert.equal(troveManagerAddress, recordedTroveManagerAddress)
  })

  // Sets BorrowerOperations in ANTMStaking
  it('Sets the correct BorrowerOperations address in ANTMStaking', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await antmStaking.borrowerOperationsAddress()
    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  // ---  ANTMToken ---

  // Sets CI in ANTMToken
  it('Sets the correct CommunityIssuance address in ANTMToken', async () => {
    const communityIssuanceAddress = communityIssuance.address

    const recordedcommunityIssuanceAddress = await antmToken.communityIssuanceAddress()
    assert.equal(communityIssuanceAddress, recordedcommunityIssuanceAddress)
  })

  // Sets ANTMStaking in ANTMToken
  it('Sets the correct ANTMStaking address in ANTMToken', async () => {
    const antmStakingAddress = antmStaking.address

    const recordedANTMStakingAddress =  await antmToken.antmStakingAddress()
    assert.equal(antmStakingAddress, recordedANTMStakingAddress)
  })

  // Sets LCF in ANTMToken
  it('Sets the correct LockupContractFactory address in ANTMToken', async () => {
    const LCFAddress = lockupContractFactory.address

    const recordedLCFAddress =  await antmToken.lockupContractFactory()
    assert.equal(LCFAddress, recordedLCFAddress)
  })

  // --- LCF  ---

  // Sets ANTMToken in LockupContractFactory
  it('Sets the correct ANTMToken address in LockupContractFactory', async () => {
    const antmTokenAddress = antmToken.address

    const recordedANTMTokenAddress = await lockupContractFactory.antmTokenAddress()
    assert.equal(antmTokenAddress, recordedANTMTokenAddress)
  })

  // --- CI ---

  // Sets ANTMToken in CommunityIssuance
  it('Sets the correct ANTMToken address in CommunityIssuance', async () => {
    const antmTokenAddress = antmToken.address

    const recordedANTMTokenAddress = await communityIssuance.antmToken()
    assert.equal(antmTokenAddress, recordedANTMTokenAddress)
  })

  it('Sets the correct StabilityPool address in CommunityIssuance', async () => {
    const stabilityPoolAddress = stabilityPool.address

    const recordedStabilityPoolAddress = await communityIssuance.stabilityPoolAddress()
    assert.equal(stabilityPoolAddress, recordedStabilityPoolAddress)
  })
})

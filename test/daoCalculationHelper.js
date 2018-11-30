/**
  Function to calculate the minimum required quorum
  for a voting to be valid
  @param _totalStake Total added stake of all participants in DigixDAO
  @param _fixedQuorumPortionNumerator Numerator of portion that takes into account the fixed quorum
        The fixed quorum applies to any proposal, no matter how small the funding required is
  @param _fixedQuorumPortionDenominator Denominator of the fixed quorum portion
  @param _scalingFactorNumerator Numerator of the scaling factor that scales up the quorum
        requirement as per the increase in funding demanded by proposal
  @param _scalingFactorDenominator Denominator of the scaling factor
  @param _weiAsked Wei asked by the proposal as funding
  @param _weiInDao Wei in DigixDAO at the moment
*/
const calculateMinQuorum = function (
  _totalStake,
  _fixedQuorumPortionNumerator,
  _fixedQuorumPortionDenominator,
  _scalingFactorNumerator,
  _scalingFactorDenominator,
  _weiAsked,
  _weiInDao,
) {
  const _minQuorum = Math.floor((_totalStake * _fixedQuorumPortionNumerator) / _fixedQuorumPortionDenominator)
                        + Math.floor((_totalStake * _weiAsked * _scalingFactorNumerator) / (_weiInDao * _scalingFactorDenominator));
  return _minQuorum;
};

/**
  Function to calculate whether the minimum quota required for a voting round
  to pass has reached or not. Returns true if yes, otherwise false
  @param _for Total "For" votes
  @param _against Total "Against" votes
  @param _quotaNumerator Numerator of the required quota
  @param _quotaDenominator Denominator of the required quota
*/
const calculateQuota = function (
  _for,
  _against,
  _quotaNumerator,
  _quotaDenominator,
) {
  const l = _for * _quotaDenominator;
  const r = _quotaNumerator * (_for + _against);
  if (l > r) return true;
  return false;
};

/**
  Function to calculate the user effective balance
  This effectiveDGD takes into account the locked DGDs, quarter points and reputation
  @param _minimalParticipationPoint minimum quarter pointsm, below which reputation is deducted
  @param _quarterPointScalingFactor scaling factor for quarter points
  @param _reputationPointScalingFactor scaling factor for reputation points
  @param _quarterPoint quarter points in that quarter
  @param _reputationPoint reputation points accumulated so far
  @param _lockedDGDStake DGDs locked during this quarter
*/
const calculateUserEffectiveBalance = function (
  _minimalParticipationPoint,
  _quarterPointScalingFactor,
  _reputationPointScalingFactor,
  _quarterPoint,
  _reputationPoint,
  _lockedDGDStake,
) {
  _minimalParticipationPoint = _minimalParticipationPoint.toNumber();
  _quarterPointScalingFactor = _quarterPointScalingFactor.toNumber();
  _reputationPointScalingFactor = _reputationPointScalingFactor.toNumber();
  _quarterPoint = _quarterPoint.toNumber();
  _reputationPoint = _reputationPoint.toNumber();
  _lockedDGDStake = _lockedDGDStake.toNumber();
  const _baseDGDBalance = _quarterPoint > _minimalParticipationPoint ? _lockedDGDStake : Math.floor((_quarterPoint * _lockedDGDStake) / _minimalParticipationPoint);
  const _effectiveDGDBalance = (_baseDGDBalance * ((_quarterPointScalingFactor + _quarterPoint) - _minimalParticipationPoint) *
                               (_reputationPointScalingFactor + _reputationPoint)) /
                               (_quarterPointScalingFactor * _reputationPointScalingFactor);
  return Math.floor(_effectiveDGDBalance);
};

// number of seconds in 24 hours
const SECONDS_IN_A_DAY = 86400;

/**
  Function to calculate the reputation based on the current reputation,
  quarter points, quarter moderator points, and other factors
*/
const calculateReputation = function (
  _currentQuarter,
  _lastParticipatedQuarter,
  _lastQuarterThatRewardsWasUpdated,
  _lastQuarterThatReputationWasUpdated,
  _maxReputationDeduction,
  _punishmentForNotLocking,
  _minimalParticipationPoint,
  _reputationPerExtraNum,
  _reputationPerExtraDen,
  _maxReputationModeratorDeduction,
  _minimalModeratorParticipationPoint,
  _reputationPerExtraModeratorNum,
  _reputationPerExtraModeratorDen,
  _currentReputation,
  _quarterPoint,
  _quarterModeratorPoint,
  _isModerator,
) {
  _currentQuarter = _currentQuarter.toNumber();
  _lastParticipatedQuarter = _lastParticipatedQuarter.toNumber();
  _lastQuarterThatRewardsWasUpdated = _lastQuarterThatRewardsWasUpdated.toNumber();
  _lastQuarterThatReputationWasUpdated = _lastQuarterThatReputationWasUpdated.toNumber();
  _maxReputationDeduction = _maxReputationDeduction.toNumber();
  _punishmentForNotLocking = _punishmentForNotLocking.toNumber();
  _minimalParticipationPoint = _minimalParticipationPoint.toNumber();
  _reputationPerExtraNum = _reputationPerExtraNum.toNumber();
  _reputationPerExtraDen = _reputationPerExtraDen.toNumber();
  _currentReputation = _currentReputation.toNumber();
  _quarterPoint = _quarterPoint.toNumber();
  _maxReputationModeratorDeduction = _maxReputationModeratorDeduction.toNumber();
  _minimalModeratorParticipationPoint = _minimalModeratorParticipationPoint.toNumber();
  _reputationPerExtraModeratorNum = _reputationPerExtraModeratorNum.toNumber();
  _reputationPerExtraModeratorDen = _reputationPerExtraModeratorDen.toNumber();
  _quarterModeratorPoint = _quarterModeratorPoint.toNumber();

  if (_currentQuarter <= _lastParticipatedQuarter) {
    return _currentReputation;
  }

  if (_lastQuarterThatReputationWasUpdated === (_lastParticipatedQuarter - 1)) {
    if (_quarterPoint < _minimalParticipationPoint) {
      _currentReputation -= Math.floor(((_minimalParticipationPoint - _quarterPoint) * _maxReputationDeduction) / _minimalParticipationPoint);
    } else {
      _currentReputation += Math.floor(((_quarterPoint - _minimalParticipationPoint) * _reputationPerExtraNum) / _reputationPerExtraDen);
    }

    if (_isModerator) {
      if (_quarterModeratorPoint < _minimalModeratorParticipationPoint) {
        _currentReputation -= Math.floor(((_minimalModeratorParticipationPoint - _quarterModeratorPoint) * _maxReputationModeratorDeduction) / _minimalModeratorParticipationPoint);
      } else {
        _currentReputation += Math.floor(((_quarterModeratorPoint - _minimalModeratorParticipationPoint) * _reputationPerExtraModeratorNum) / _reputationPerExtraModeratorDen);
      }
    }
  }

  const _fineForNotLocking = (_currentQuarter - 1 - max(_lastParticipatedQuarter, _lastQuarterThatReputationWasUpdated)) * (_maxReputationDeduction + _punishmentForNotLocking);
  _currentReputation = _fineForNotLocking > _currentReputation ? 0 : (_currentReputation - _fineForNotLocking);
  return _currentReputation;
};

// Function to return the maximum of a and b
const max = function (a, b) {
  if (a > b) return a;
  return b;
};

/**
  Function to calculate the demurrage to be paid in DGX
  for holding DGX from _dgxDistributionDay1 to _dgxDistributionDay2
  The function returns the demurrage to be deducted based on the _rewardsBefore
  which is the DGX held from before
*/
const calculateDgxDemurrage = function (
  _rewardsBefore,
  _dgxDistributionDay1,
  _dgxDistributionDay2,
  _demurrageBase,
  _demurrageRate,
) {
  _rewardsBefore = _rewardsBefore.toNumber();
  _dgxDistributionDay1 = _dgxDistributionDay1.toNumber();
  _dgxDistributionDay2 = _dgxDistributionDay2.toNumber();
  _demurrageBase = _demurrageBase.toNumber();
  _demurrageRate = _demurrageRate.toNumber();

  const _demurrageFees = (_rewardsBefore * Math.floor((_dgxDistributionDay1 - _dgxDistributionDay2) / SECONDS_IN_A_DAY) *
                         _demurrageRate) / _demurrageBase;
  return Math.floor(_demurrageFees);
};

/**
  Function to calculate DGX rewards based on effectiveDGDBalance and the cumulative
  of all effectiveDGD balances, and the DGX rewards pool, portion dedicated only to moderators
*/
const calculateDgxRewards = function (
  _effectiveDGDBalance,
  _effectiveBadgeBalance,
  _portionToBadgeNum,
  _portionToBadgeDen,
  _rewardsPool,
  _cumulativeDGDBalance,
  _cumulativeBadgeBalance,
) {
  _portionToBadgeNum = _portionToBadgeNum.toNumber();
  _portionToBadgeDen = _portionToBadgeDen.toNumber();
  _rewardsPool = _rewardsPool.toNumber();
  _cumulativeDGDBalance = _cumulativeDGDBalance.toNumber();
  _cumulativeBadgeBalance = _cumulativeBadgeBalance.toNumber();

  let _rewards = Math.floor((_effectiveDGDBalance * _rewardsPool * (_portionToBadgeDen - _portionToBadgeNum)) /
                   (_cumulativeDGDBalance * _portionToBadgeDen));
  if (_cumulativeBadgeBalance > 0) {
    _rewards += Math.floor((_effectiveBadgeBalance * _rewardsPool * _portionToBadgeNum) /
      (_cumulativeBadgeBalance * _portionToBadgeDen));
  }
  return _rewards;
};

/**
  Calculate the bonus reputation given to participants for their correct votes
  this depends on the quarter point for the vote and factors for calculating this bonus
*/
const getBonusReputation = function (
  _quarterPointPerVote,
  _bonusReputationNumerator,
  _bonusReputationDenominator,
  _reputationPerExtraNum,
  _reputationPerExtraDen,
) {
  _quarterPointPerVote = _quarterPointPerVote.toNumber();
  _bonusReputationNumerator = _bonusReputationNumerator.toNumber();
  _bonusReputationDenominator = _bonusReputationDenominator.toNumber();
  _reputationPerExtraNum = _reputationPerExtraNum.toNumber();
  _reputationPerExtraDen = _reputationPerExtraDen.toNumber();

  return Math.floor((_quarterPointPerVote * _bonusReputationNumerator * _reputationPerExtraNum) /
    (_reputationPerExtraDen * _bonusReputationDenominator));
};

/**
  Calculate the scaled DGD based on how much time is left in the main phase.
*/
const scaledDgd = function (
  _timeNow,
  _startOfFirstQuarter,
  _lockingPhaseDuration,
  _quarterDuration,
  _amount,
) {
  const _timeInQuarter = (_timeNow - _startOfFirstQuarter) % _quarterDuration;
  if (_timeInQuarter < _lockingPhaseDuration) {
    return _amount;
  }
  return Math.floor((_amount * (_quarterDuration - _timeInQuarter)) / (_quarterDuration - _lockingPhaseDuration));
};

module.exports = {
  calculateMinQuorum,
  calculateQuota,
  calculateUserEffectiveBalance,
  calculateDgxDemurrage,
  calculateDgxRewards,
  calculateReputation,
  getBonusReputation,
  scaledDgd,
  SECONDS_IN_A_DAY,
};

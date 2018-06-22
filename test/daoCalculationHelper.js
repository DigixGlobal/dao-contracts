const calculateMinQuorum = function (
  _totalStake,
  _fixedQuorumPortionNumerator,
  _fixedQuorumPortionDenominator,
  _scalingFactorNumerator,
  _scalingFactorDenominator,
  _ethAsked,
  _ethInDao,
) {
  const _minQuorum = Math.floor((_totalStake * _fixedQuorumPortionNumerator) / _fixedQuorumPortionDenominator)
                        + Math.floor((_totalStake * _ethAsked * _scalingFactorNumerator) / (_ethInDao * _scalingFactorDenominator));
  return _minQuorum;
};

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
  const _baseDGDBalance = _quarterPoint > _minimalParticipationPoint ? _lockedDGDStake : ((_quarterPoint * _lockedDGDStake) / _minimalParticipationPoint);
  const _effectiveDGDBalance = (_baseDGDBalance * ((_quarterPointScalingFactor + _quarterPoint) - _minimalParticipationPoint) *
                               (_reputationPointScalingFactor + _reputationPoint)) /
                               (_quarterPointScalingFactor * _reputationPointScalingFactor);
  return Math.floor(_effectiveDGDBalance);
};

const SECONDS_IN_A_DAY = 86400;

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
  _currentReputation,
  _quarterPoint,
) {
  _currentQuarter = _currentQuarter.toNumber();
  _lastParticipatedQuarter = _lastParticipatedQuarter.toNumber();
  _lastQuarterThatRewardsWasUpdated = _lastQuarterThatRewardsWasUpdated.toNumber();
  _maxReputationDeduction = _maxReputationDeduction.toNumber();
  _punishmentForNotLocking = _punishmentForNotLocking.toNumber();
  _minimalParticipationPoint = _minimalParticipationPoint.toNumber();
  _reputationPerExtraNum = _reputationPerExtraNum.toNumber();
  _reputationPerExtraDen = _reputationPerExtraDen.toNumber();
  _currentReputation = _currentReputation.toNumber();
  _quarterPoint = _quarterPoint.toNumber();

  if (_currentQuarter <= _lastParticipatedQuarter) {
    return _currentReputation;
  }

  if (_lastParticipatedQuarter > _lastQuarterThatReputationWasUpdated) {
    if (_quarterPoint < _minimalParticipationPoint) {
      _currentReputation -= Math.floor(((_minimalParticipationPoint - _quarterPoint) * _maxReputationDeduction) / _minimalParticipationPoint);
    } else {
      _currentReputation += Math.floor(((_quarterPoint - _minimalParticipationPoint) * _reputationPerExtraNum) / _reputationPerExtraDen);
    }
  } else {
    const _fineForNotLocking = (_currentQuarter - 1 - _lastParticipatedQuarter) * (_maxReputationDeduction + _punishmentForNotLocking);
    _currentReputation = _fineForNotLocking > _currentReputation ? 0 : (_currentReputation - _fineForNotLocking);
  }
  return _currentReputation;
};

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

module.exports = {
  calculateMinQuorum,
  calculateQuota,
  calculateUserEffectiveBalance,
  calculateDgxDemurrage,
  calculateDgxRewards,
  calculateReputation,
  SECONDS_IN_A_DAY,
};

const calculateMinQuorum = function (
  _totalStake,
  _fixedQuorumPortionNumerator,
  _fixedQuorumPortionDenominator,
  _scalingFactorNumerator,
  _scalingFactorDenominator,
  _ethAsked,
  _ethInDao
) {
  const _minQuorum = Math.floor(_totalStake * _fixedQuorumPortionNumerator / _fixedQuorumPortionDenominator)
                        + Math.floor(_totalStake * _ethAsked * _scalingFactorNumerator / (_ethInDao * _scalingFactorDenominator));
  return _minQuorum
};

const calculateQuota = function (
  _for,
  _against,
  _quotaNumerator,
  _quotaDenominator
) {
  const l = _for * _quotaDenominator;
  const r = _quotaNumerator * (_for + _against);
  if (l > r) return true;
  return false;
}

module.exports = {
  calculateMinQuorum,
  calculateQuota
};

function coteFromRank(rank) {
  if (rank == null) return 2.5;
  if (rank <= 3) return 1.0;
  if (rank <= 10) return 1.3;
  if (rank <= 25) return 1.6;
  if (rank <= 50) return 2.0;
  return 2.5;
}

module.exports = { coteFromRank };

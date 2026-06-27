-- CreateIndex
CREATE INDEX "Bet_userId_settled_idx" ON "Bet"("userId", "settled");

-- CreateIndex
CREATE INDEX "Match_phase_round_idx" ON "Match"("phase", "round");

-- CreateIndex
CREATE INDEX "Match_status_scheduledAt_idx" ON "Match"("status", "scheduledAt");

import { describe, it, expect, beforeEach } from "vitest";
import { uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_PROPOSAL_NOT_FOUND = 101;
const ERR_PROPOSAL_INACTIVE = 102;
const ERR_INSUFFICIENT_STAKE = 103;
const ERR_ALREADY_VOTED = 104;
const ERR_VOTING_CLOSED = 105;
const ERR_INVALID_VOTE_AMOUNT = 106;
const ERR_NOT_STAKED = 107;
const ERR_CALCULATION_ERROR = 108;
const ERR_PROPOSAL_EXPIRED = 109;
const ERR_INVALID_PROPOSAL_ID = 110;
const ERR_VOTE_NOT_STARTED = 111;
const ERR_INVALID_QUADRATIC_WEIGHT = 112;
const ERR_OVERFLOW = 113;
const ERR_TREASURY_FAIL = 114;
const ERR_STAKING_FAIL = 115;
const ERR_INVALID_THRESHOLD = 116;
const ERR_PROPOSAL_ALREADY_EXECUTED = 117;
const ERR_INVALID_STATUS = 118;
const ERR_MAX_PROPOSALS_EXCEEDED = 119;
const ERR_INVALID_DURATION = 120;
const ERR_INVALID_START_TIME = 121;
const ERR_INVALID_END_TIME = 122;
const ERR_INVALID_CHARITY_ID = 123;
const ERR_INVALID_AMOUNT = 124;
const ERR_NO_VOTES = 125;

interface Proposal {
  charityId: number;
  amount: number;
  startTime: number;
  endTime: number;
  totalVotes: number;
  executed: boolean;
  proposer: string;
}

interface Vote {
  voteAmount: number;
  quadraticWeight: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class VotingContractMock {
  state: {
    nextProposalId: number;
    maxProposals: number;
    votingThreshold: number;
    minVoteAmount: number;
    stakingContract: string;
    treasuryContract: string;
    charityRegistryContract: string;
    proposals: Map<number, Proposal>;
    votes: Map<string, Vote>;
    proposalVoters: Map<number, string[]>;
    proposalStatus: Map<number, boolean>;
  } = {
    nextProposalId: 0,
    maxProposals: 1000,
    votingThreshold: 50,
    minVoteAmount: 1,
    stakingContract: "SP000000000000000000002Q6VF78",
    treasuryContract: "SP000000000000000000002Q6VF78",
    charityRegistryContract: "SP000000000000000000002Q6VF78",
    proposals: new Map(),
    votes: new Map(),
    proposalVoters: new Map(),
    proposalStatus: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextProposalId: 0,
      maxProposals: 1000,
      votingThreshold: 50,
      minVoteAmount: 1,
      stakingContract: "SP000000000000000000002Q6VF78",
      treasuryContract: "SP000000000000000000002Q6VF78",
      charityRegistryContract: "SP000000000000000000002Q6VF78",
      proposals: new Map(),
      votes: new Map(),
      proposalVoters: new Map(),
      proposalStatus: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
  }

  getProposal(id: number): Proposal | undefined {
    return this.state.proposals.get(id);
  }

  getVote(proposalId: number, voter: string): Vote | undefined {
    return this.state.votes.get(`${proposalId}-${voter}`);
  }

  getProposalVoters(id: number): string[] | undefined {
    return this.state.proposalVoters.get(id);
  }

  getProposalStatus(id: number): boolean | undefined {
    return this.state.proposalStatus.get(id);
  }

  getNextProposalId(): number {
    return this.state.nextProposalId;
  }

  getVotingThreshold(): number {
    return this.state.votingThreshold;
  }

  setVotingThreshold(newThreshold: number): Result<boolean> {
    if (this.caller !== this.state.treasuryContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newThreshold <= 0 || newThreshold > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    this.state.votingThreshold = newThreshold;
    return { ok: true, value: true };
  }

  setMinVoteAmount(newMin: number): Result<boolean> {
    if (this.caller !== this.state.treasuryContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newMin <= 0) return { ok: false, value: ERR_INVALID_VOTE_AMOUNT };
    this.state.minVoteAmount = newMin;
    return { ok: true, value: true };
  }

  setStakingContract(newContract: string): Result<boolean> {
    if (this.caller !== this.state.treasuryContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.stakingContract = newContract;
    return { ok: true, value: true };
  }

  setTreasuryContract(newContract: string): Result<boolean> {
    if (this.caller !== this.state.treasuryContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.treasuryContract = newContract;
    return { ok: true, value: true };
  }

  setCharityRegistryContract(newContract: string): Result<boolean> {
    if (this.caller !== this.state.treasuryContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.charityRegistryContract = newContract;
    return { ok: true, value: true };
  }

  createProposal(charityId: number, amount: number, duration: number): Result<number> {
    if (this.state.nextProposalId >= this.state.maxProposals) return { ok: false, value: ERR_MAX_PROPOSALS_EXCEEDED };
    if (duration <= 0) return { ok: false, value: ERR_INVALID_DURATION };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    const startTime = this.blockHeight + 1;
    const endTime = startTime + duration;
    const id = this.state.nextProposalId;
    this.state.proposals.set(id, {
      charityId,
      amount,
      startTime,
      endTime,
      totalVotes: 0,
      executed: false,
      proposer: this.caller,
    });
    this.state.proposalStatus.set(id, true);
    this.state.nextProposalId++;
    return { ok: true, value: id };
  }

  voteOnProposal(proposalId: number, voteAmount: number): Result<boolean> {
    const proposal = this.state.proposals.get(proposalId);
    if (!proposal) return { ok: false, value: ERR_PROPOSAL_NOT_FOUND };
    if (proposalId >= this.state.nextProposalId) return { ok: false, value: ERR_INVALID_PROPOSAL_ID };
    if (this.blockHeight < proposal.startTime || this.blockHeight > proposal.endTime || proposal.executed) return { ok: false, value: ERR_PROPOSAL_INACTIVE };
    if (this.getVote(proposalId, this.caller)) return { ok: false, value: ERR_ALREADY_VOTED };
    if (voteAmount < this.state.minVoteAmount || voteAmount <= 0) return { ok: false, value: ERR_INVALID_VOTE_AMOUNT };
    const sqrtAmount = Math.floor(Math.sqrt(voteAmount));
    if (sqrtAmount * sqrtAmount !== voteAmount) return { ok: false, value: ERR_CALCULATION_ERROR };
    this.state.votes.set(`${proposalId}-${this.caller}`, { voteAmount, quadraticWeight: sqrtAmount });
    proposal.totalVotes += sqrtAmount;
    const voters = this.state.proposalVoters.get(proposalId) || [];
    voters.push(this.caller);
    this.state.proposalVoters.set(proposalId, voters);
    return { ok: true, value: true };
  }

  executeProposal(proposalId: number): Result<boolean> {
    const proposal = this.state.proposals.get(proposalId);
    if (!proposal) return { ok: false, value: ERR_PROPOSAL_NOT_FOUND };
    if (this.blockHeight <= proposal.endTime) return { ok: false, value: ERR_VOTING_CLOSED };
    if (proposal.executed) return { ok: false, value: ERR_PROPOSAL_ALREADY_EXECUTED };
    if (proposal.totalVotes < this.state.votingThreshold) return { ok: false, value: ERR_INVALID_THRESHOLD };
    proposal.executed = true;
    this.state.proposalStatus.set(proposalId, false);
    return { ok: true, value: true };
  }

  getTotalVotes(proposalId: number): number {
    return this.state.proposals.get(proposalId)?.totalVotes || 0;
  }

  hasVoted(proposalId: number, voter: string): boolean {
    return !!this.getVote(proposalId, voter);
  }

  getQuadraticWeight(proposalId: number, voter: string): number {
    return this.getVote(proposalId, voter)?.quadraticWeight || 0;
  }

  isProposalActive(proposalId: number): boolean {
    return this.state.proposalStatus.get(proposalId) || false;
  }

  getProposalCount(): number {
    return this.state.nextProposalId;
  }
}

describe("VotingContract", () => {
  let contract: VotingContractMock;

  beforeEach(() => {
    contract = new VotingContractMock();
    contract.reset();
  });

  it("creates a proposal successfully", () => {
    const result = contract.createProposal(1, 1000, 10);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const proposal = contract.getProposal(0);
    expect(proposal?.charityId).toBe(1);
    expect(proposal?.amount).toBe(1000);
    expect(proposal?.startTime).toBe(1);
    expect(proposal?.endTime).toBe(11);
    expect(proposal?.totalVotes).toBe(0);
    expect(proposal?.executed).toBe(false);
    expect(proposal?.proposer).toBe("ST1TEST");
    expect(contract.getProposalStatus(0)).toBe(true);
  });

  it("rejects proposal creation with invalid duration", () => {
    const result = contract.createProposal(1, 1000, 0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DURATION);
  });

  it("rejects proposal creation with invalid amount", () => {
    const result = contract.createProposal(1, 0, 10);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("votes on proposal successfully", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 1;
    const result = contract.voteOnProposal(0, 100);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const vote = contract.getVote(0, "ST1TEST");
    expect(vote?.voteAmount).toBe(100);
    expect(vote?.quadraticWeight).toBe(10);
    expect(contract.getTotalVotes(0)).toBe(10);
    const voters = contract.getProposalVoters(0);
    expect(voters).toContain("ST1TEST");
  });

  it("rejects vote on non-existent proposal", () => {
    const result = contract.voteOnProposal(99, 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PROPOSAL_NOT_FOUND);
  });

  it("rejects vote if already voted", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 1;
    contract.voteOnProposal(0, 100);
    const result = contract.voteOnProposal(0, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ALREADY_VOTED);
  });

  it("rejects vote with invalid amount", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 1;
    const result = contract.voteOnProposal(0, 0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_VOTE_AMOUNT);
  });

  it("rejects vote before start time", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 0;
    const result = contract.voteOnProposal(0, 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PROPOSAL_INACTIVE);
  });

  it("rejects vote after end time", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 12;
    const result = contract.voteOnProposal(0, 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PROPOSAL_INACTIVE);
  });

  it("executes proposal successfully", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 1;
    contract.voteOnProposal(0, 2500); // sqrt(2500)=50, meets threshold
    contract.blockHeight = 12;
    const result = contract.executeProposal(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const proposal = contract.getProposal(0);
    expect(proposal?.executed).toBe(true);
    expect(contract.getProposalStatus(0)).toBe(false);
  });

  it("rejects execution before voting closed", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 10;
    const result = contract.executeProposal(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_VOTING_CLOSED);
  });

  it("rejects execution if already executed", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 1;
    contract.voteOnProposal(0, 2500);
    contract.blockHeight = 12;
    contract.executeProposal(0);
    const result = contract.executeProposal(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PROPOSAL_ALREADY_EXECUTED);
  });

  it("rejects execution if votes below threshold", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 1;
    contract.voteOnProposal(0, 100); // sqrt(100)=10 < 50
    contract.blockHeight = 12;
    const result = contract.executeProposal(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_THRESHOLD);
  });

  it("sets voting threshold successfully", () => {
    contract.caller = contract.state.treasuryContract;
    const result = contract.setVotingThreshold(60);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getVotingThreshold()).toBe(60);
  });

  it("rejects setting voting threshold by unauthorized", () => {
    const result = contract.setVotingThreshold(60);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("sets min vote amount successfully", () => {
    contract.caller = contract.state.treasuryContract;
    const result = contract.setMinVoteAmount(10);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.minVoteAmount).toBe(10);
  });

  it("rejects quadratic vote with non-perfect square", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 1;
    const result = contract.voteOnProposal(0, 101); // sqrt(101) not integer
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_CALCULATION_ERROR);
  });

  it("gets total votes correctly", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 1;
    contract.voteOnProposal(0, 100);
    expect(contract.getTotalVotes(0)).toBe(10);
  });

  it("checks if has voted correctly", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 1;
    contract.voteOnProposal(0, 100);
    expect(contract.hasVoted(0, "ST1TEST")).toBe(true);
    expect(contract.hasVoted(0, "ST2OTHER")).toBe(false);
  });

  it("gets quadratic weight correctly", () => {
    contract.createProposal(1, 1000, 10);
    contract.blockHeight = 1;
    contract.voteOnProposal(0, 100);
    expect(contract.getQuadraticWeight(0, "ST1TEST")).toBe(10);
    expect(contract.getQuadraticWeight(0, "ST2OTHER")).toBe(0);
  });

  it("gets proposal count correctly", () => {
    contract.createProposal(1, 1000, 10);
    contract.createProposal(2, 2000, 20);
    expect(contract.getProposalCount()).toBe(2);
  });

  it("parses proposal id with Clarity", () => {
    const cv = uintCV(42);
    expect(cv.value).toEqual(BigInt(42));
  });
});
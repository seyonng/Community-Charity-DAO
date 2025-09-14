(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-PROPOSAL-NOT-FOUND u101)
(define-constant ERR-PROPOSAL-INACTIVE u102)
(define-constant ERR-INSUFFICIENT-STAKE u103)
(define-constant ERR-ALREADY-VOTED u104)
(define-constant ERR-VOTING-CLOSED u105)
(define-constant ERR-INVALID-VOTE-AMOUNT u106)
(define-constant ERR-NOT-STAKED u107)
(define-constant ERR-CALCULATION-ERROR u108)
(define-constant ERR-PROPOSAL-EXPIRED u109)
(define-constant ERR-INVALID-PROPOSAL-ID u110)
(define-constant ERR-VOTE-NOT-STARTED u111)
(define-constant ERR-INVALID-QUADRATIC-WEIGHT u112)
(define-constant ERR-OVERFLOW u113)
(define-constant ERR-TREASURY-FAIL u114)
(define-constant ERR-STAKING-FAIL u115)
(define-constant ERR-INVALID-THRESHOLD u116)
(define-constant ERR-PROPOSAL-ALREADY-EXECUTED u117)
(define-constant ERR-INVALID-STATUS u118)
(define-constant ERR-MAX-PROPOSALS-EXCEEDED u119)
(define-constant ERR-INVALID-DURATION u120)
(define-constant ERR-INVALID-START-TIME u121)
(define-constant ERR-INVALID-END-TIME u122)
(define-constant ERR-INVALID-CHARITY-ID u123)
(define-constant ERR-INVALID-AMOUNT u124)
(define-constant ERR-NO-VOTES u125)

(define-data-var next-proposal-id uint u0)
(define-data-var max-proposals uint u1000)
(define-data-var voting-threshold uint u50)
(define-data-var min-vote-amount uint u1)
(define-data-var staking-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var treasury-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var charity-registry-contract principal 'SP000000000000000000002Q6VF78)

(define-map proposals
  uint
  {
    charity-id: uint,
    amount: uint,
    start-time: uint,
    end-time: uint,
    total-votes: uint,
    executed: bool,
    proposer: principal
  }
)

(define-map votes
  { proposal-id: uint, voter: principal }
  { vote-amount: uint, quadratic-weight: uint }
)

(define-map proposal-voters uint (list 1000 principal))

(define-map proposal-status uint bool)

(define-read-only (get-proposal (id uint))
  (map-get? proposals id)
)

(define-read-only (get-vote (proposal-id uint) (voter principal))
  (map-get? votes { proposal-id: proposal-id, voter: voter })
)

(define-read-only (get-proposal-voters (id uint))
  (map-get? proposal-voters id)
)

(define-read-only (get-proposal-status (id uint))
  (map-get? proposal-status id)
)

(define-read-only (get-next-proposal-id)
  (var-get next-proposal-id)
)

(define-read-only (get-voting-threshold)
  (var-get voting-threshold)
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-private (validate-proposal-id (id uint))
  (if (< id (var-get next-proposal-id))
      (ok true)
      (err ERR-INVALID-PROPOSAL-ID))
)

(define-private (validate-vote-amount (amount uint))
  (if (and (>= amount (var-get min-vote-amount)) (> amount u0))
      (ok true)
      (err ERR-INVALID-VOTE-AMOUNT))
)

(define-private (validate-proposal-active (proposal { charity-id: uint, amount: uint, start-time: uint, end-time: uint, total-votes: uint, executed: bool, proposer: principal }))
  (if (and (>= block-height (get start-time proposal)) (<= block-height (get end-time proposal)) (not (get executed proposal)))
      (ok true)
      (err ERR-PROPOSAL-INACTIVE))
)

(define-private (validate-not-voted (proposal-id uint) (voter principal))
  (match (get-vote proposal-id voter)
    some-vote (err ERR-ALREADY-VOTED)
    (ok true))
)

(define-private (validate-staked-balance (voter principal) (amount uint))
  (let ((staked (contract-call? (var-get staking-contract) get-staked-balance voter)))
    (match staked
      balance (if (>= balance amount) (ok true) (err ERR-INSUFFICIENT-STAKE))
      (err ERR-STAKING-FAIL)))
)

(define-private (calculate-quadratic-weight (amount uint))
  (let ((sqrt-amount (unwrap! (sqrt amount) (err ERR-CALCULATION-ERROR))))
    (ok sqrt-amount))
)

(define-private (update-total-votes (proposal-id uint) (weight uint))
  (let ((proposal (unwrap! (get-proposal proposal-id) (err ERR-PROPOSAL-NOT-FOUND))))
    (map-set proposals proposal-id
      (merge proposal { total-votes: (+ (get total-votes proposal) weight) }))
    (ok true))
)

(define-private (add-voter-to-list (proposal-id uint) (voter principal))
  (let ((voters (default-to (list) (get-proposal-voters proposal-id))))
    (map-set proposal-voters proposal-id (unwrap! (as-max-len? (append voters voter) u1000) (err ERR-OVERFLOW)))
    (ok true))
)

(define-public (set-voting-threshold (new-threshold uint))
  (begin
    (asserts! (is-eq tx-sender (var-get treasury-contract)) (err ERR-NOT-AUTHORIZED))
    (asserts! (and (> new-threshold u0) (<= new-threshold u100)) (err ERR-INVALID-THRESHOLD))
    (var-set voting-threshold new-threshold)
    (ok true))
)

(define-public (set-min-vote-amount (new-min uint))
  (begin
    (asserts! (is-eq tx-sender (var-get treasury-contract)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-min u0) (err ERR-INVALID-VOTE-AMOUNT))
    (var-set min-vote-amount new-min)
    (ok true))
)

(define-public (set-staking-contract (new-contract principal))
  (begin
    (asserts! (is-eq tx-sender (var-get treasury-contract)) (err ERR-NOT-AUTHORIZED))
    (try! (validate-principal new-contract))
    (var-set staking-contract new-contract)
    (ok true))
)

(define-public (set-treasury-contract (new-contract principal))
  (begin
    (asserts! (is-eq tx-sender (var-get treasury-contract)) (err ERR-NOT-AUTHORIZED))
    (try! (validate-principal new-contract))
    (var-set treasury-contract new-contract)
    (ok true))
)

(define-public (set-charity-registry-contract (new-contract principal))
  (begin
    (asserts! (is-eq tx-sender (var-get treasury-contract)) (err ERR-NOT-AUTHORIZED))
    (try! (validate-principal new-contract))
    (var-set charity-registry-contract new-contract)
    (ok true))
)

(define-public (create-proposal (charity-id uint) (amount uint) (duration uint))
  (let ((start-time (+ block-height u1))
        (end-time (+ start-time duration))
        (id (var-get next-proposal-id)))
    (asserts! (< id (var-get max-proposals)) (err ERR-MAX-PROPOSALS-EXCEEDED))
    (asserts! (> duration u0) (err ERR-INVALID-DURATION))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (asserts! (is-ok (contract-call? (var-get charity-registry-contract) is-charity-verified charity-id)) (err ERR-INVALID-CHARITY-ID))
    (map-set proposals id
      {
        charity-id: charity-id,
        amount: amount,
        start-time: start-time,
        end-time: end-time,
        total-votes: u0,
        executed: false,
        proposer: tx-sender
      }
    )
    (map-set proposal-status id true)
    (var-set next-proposal-id (+ id u1))
    (print { event: "proposal-created", id: id })
    (ok id))
)

(define-public (vote-on-proposal (proposal-id uint) (vote-amount uint))
  (let ((voter tx-sender)
        (proposal (unwrap! (map-get? proposals proposal-id) (err ERR-PROPOSAL-NOT-FOUND))))
    (try! (validate-proposal-id proposal-id))
    (try! (validate-proposal-active proposal))
    (try! (validate-not-voted proposal-id voter))
    (try! (validate-vote-amount vote-amount))
    (try! (validate-staked-balance voter vote-amount))
    (let ((weight (unwrap! (calculate-quadratic-weight vote-amount) (err ERR-CALCULATION-ERROR))))
      (map-set votes { proposal-id: proposal-id, voter: voter } { vote-amount: vote-amount, quadratic-weight: weight })
      (try! (update-total-votes proposal-id weight))
      (try! (add-voter-to-list proposal-id voter))
      (print { event: "vote-cast", proposal-id: proposal-id, voter: voter, weight: weight })
      (ok true))
  )
)

(define-public (execute-proposal (proposal-id uint))
  (let ((proposal (unwrap! (map-get? proposals proposal-id) (err ERR-PROPOSAL-NOT-FOUND))))
    (asserts! (> block-height (get end-time proposal)) (err ERR-VOTING-CLOSED))
    (asserts! (not (get executed proposal)) (err ERR-PROPOSAL-ALREADY-EXECUTED))
    (asserts! (>= (get total-votes proposal) (var-get voting-threshold)) (err ERR-INVALID-THRESHOLD))
    (let ((payout (contract-call? (var-get treasury-contract) execute-payout proposal-id (get amount proposal) (get charity-id proposal))))
      (match payout
        success (begin
                  (map-set proposals proposal-id (merge proposal { executed: true }))
                  (map-set proposal-status proposal-id false)
                  (print { event: "proposal-executed", id: proposal-id })
                  (ok true))
        error (err ERR-TREASURY-FAIL))))
)

(define-read-only (get-total-votes (proposal-id uint))
  (let ((proposal (default-to { charity-id: u0, amount: u0, start-time: u0, end-time: u0, total-votes: u0, executed: false, proposer: tx-sender } (map-get? proposals proposal-id))))
    (get total-votes proposal))
)

(define-read-only (has-voted (proposal-id uint) (voter principal))
  (is-some (map-get? votes { proposal-id: proposal-id, voter: voter }))
)

(define-read-only (get-quadratic-weight (proposal-id uint) (voter principal))
  (match (map-get? votes { proposal-id: proposal-id, voter: voter })
    vote (get quadratic-weight vote)
    u0)
)

(define-read-only (is-proposal-active (proposal-id uint))
  (default-to false (map-get? proposal-status proposal-id))
)

(define-read-only (get-proposal-count)
  (var-get next-proposal-id)
)
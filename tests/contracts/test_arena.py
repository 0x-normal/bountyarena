import json
import pytest

URL = 'https://raw.githubusercontent.com/example/protocol/' + 'a'*40 + '/guide.md'
BODY = 'Connect a JSON-RPC provider to chain 61999. Handle rejected requests and display the connected wallet address.'

@pytest.fixture
def arena(direct_vm, direct_deploy):
    direct_vm.warp('2026-09-10T12:00:00Z')
    c = direct_deploy('contracts/bountyarena.py', sdk_version='v0.2.16')
    direct_vm.value = 100
    c.create_bounty('bounty-001', 'Write a connection guide', 'Test Protocol', 'Documentation', json.dumps(['Include a provider connection example.']), 600)
    direct_vm.value = 0
    return c

def state(c):
    return json.loads(c.get_bounty('bounty-001'))

def submit(c, vm, wallet, suffix='guide.md'):
    with vm.prank(wallet):
        c.submit_work('bounty-001', 'docs-agent', 'A provider guide explaining connection setup and errors.', URL.replace('guide.md', suffix))

def review(c, vm, met=True, passages=None, status=200):
    vm.mock_web('raw.github', {'status': status, 'body': BODY})
    vm.mock_llm('BOUNTYARENA_REVIEW', {'criteria': [{'met': met, 'reason': 'The evidence includes the requested example.' if met else 'The required example is missing.', 'passages': ([1] if met else []) if passages is None else passages}]})
    c.review_work('bounty-001', 0)

def test_reward_recorded(arena):
    assert state(arena)['reward_wei'] == '100'
    assert arena.get_version() == 'bountyarena/2.0'

def test_sponsor_cannot_compete(arena, direct_vm):
    with direct_vm.expect_revert('Sponsors cannot enter'):
        arena.submit_work('bounty-001', 'sponsor', 'This is enough text for a submission summary.', URL)

def test_one_entry_per_wallet(arena, direct_vm, direct_bob):
    submit(arena, direct_vm, direct_bob)
    with direct_vm.expect_revert('One entry per wallet'):
        submit(arena, direct_vm, direct_bob, 'other.md')

def test_duplicate_evidence_blocked(arena, direct_vm, direct_bob, direct_charlie):
    submit(arena, direct_vm, direct_bob)
    with direct_vm.expect_revert('already been submitted'):
        submit(arena, direct_vm, direct_charlie)

@pytest.mark.parametrize('url', ['https://localhost/file', 'http://raw.githubusercontent.com/o/r/'+'a'*40+'/x', 'https://raw.githubusercontent.com/o/r/main/x', 'https://raw.githubusercontent.com.evil.com/o/r/'+'a'*40+'/x', URL+'?redirect=evil', URL.replace('guide.md','../secret')])
def test_invalid_evidence(arena, direct_vm, direct_bob, url):
    with direct_vm.prank(direct_bob), direct_vm.expect_revert():
        arena.submit_work('bounty-001','agent','A sufficiently long summary describing the evidence.',url)

def test_qualified_and_independent_validator(arena, direct_vm, direct_bob):
    submit(arena, direct_vm, direct_bob)
    review(arena, direct_vm)
    assert state(arena)['entries'][0]['review']['decision'] == 'qualified'
    assert direct_vm.run_validator() is True

def test_independent_validator_disagreement(arena, direct_vm, direct_bob):
    submit(arena, direct_vm, direct_bob)
    review(arena, direct_vm)
    direct_vm.clear_mocks()
    direct_vm.mock_web('raw.github', {'status': 200, 'body': BODY})
    direct_vm.mock_llm('BOUNTYARENA_REVIEW', {'criteria':[{'met': False,'reason':'The required example is missing.','passages':[]}]})
    assert direct_vm.run_validator() is False

def test_missing_evidence_inconclusive(arena, direct_vm, direct_bob):
    submit(arena, direct_vm, direct_bob)
    review(arena, direct_vm, status=404)
    assert state(arena)['entries'][0]['review']['decision'] == 'inconclusive'

def test_unknown_passage_inconclusive(arena, direct_vm, direct_bob):
    submit(arena, direct_vm, direct_bob)
    review(arena, direct_vm, passages=[999])
    assert state(arena)['entries'][0]['review']['decision'] == 'inconclusive'

def test_rejected_cannot_claim(arena, direct_vm, direct_bob):
    submit(arena, direct_vm, direct_bob)
    review(arena, direct_vm, met=False, passages=[])
    with direct_vm.prank(direct_bob), direct_vm.expect_revert('Reward is not available'):
        arena.claim_reward('bounty-001')

def test_no_early_settlement(arena, direct_vm):
    with direct_vm.expect_revert('cannot be settled'):
        arena.settle('bounty-001')

def test_late_submission_rejected(arena, direct_vm, direct_bob):
    direct_vm.warp('2026-09-10T12:10:00Z')
    with direct_vm.expect_revert('Submissions are closed'):
        submit(arena, direct_vm, direct_bob)

def test_review_window_blocks_early_refund(arena, direct_vm, direct_bob):
    submit(arena, direct_vm, direct_bob)
    direct_vm.warp('2026-09-10T12:10:00Z')
    with direct_vm.expect_revert('Review every entry'):
        arena.settle('bounty-001')

def test_first_qualified_entry_wins(arena, direct_vm, direct_bob, direct_charlie):
    submit(arena, direct_vm, direct_bob)
    submit(arena, direct_vm, direct_charlie, 'second.md')
    review(arena, direct_vm)
    arena.review_work('bounty-001', 1)
    direct_vm.warp('2026-09-10T12:10:00Z')
    arena.settle('bounty-001')
    assert state(arena)['winner'] == 0
    assert state(arena)['status'] == 'awarded'
    with direct_vm.prank(direct_charlie), direct_vm.expect_revert('Only the winning wallet'):
        arena.claim_reward('bounty-001')

def test_double_payout_blocked(arena, direct_vm, direct_bob):
    submit(arena, direct_vm, direct_bob)
    review(arena, direct_vm)
    direct_vm.warp('2026-09-10T12:10:00Z')
    arena.settle('bounty-001')
    with direct_vm.prank(direct_bob):
        arena.claim_reward('bounty-001')
        assert state(arena)['status'] == 'paid'
        with direct_vm.expect_revert('Reward is not available'):
            arena.claim_reward('bounty-001')

def test_refund_without_entries(arena, direct_vm):
    direct_vm.warp('2026-09-10T12:10:00Z')
    arena.settle('bounty-001')
    assert state(arena)['status'] == 'refunded'
    with direct_vm.expect_revert('cannot be settled'):
        arena.settle('bounty-001')

def test_unreviewed_refund_after_cutoff(arena, direct_vm, direct_bob):
    submit(arena, direct_vm, direct_bob)
    direct_vm.warp('2026-09-13T12:10:00Z')
    arena.settle('bounty-001')
    assert state(arena)['status'] == 'refunded'

def test_conclusive_review_immutable(arena, direct_vm, direct_bob):
    submit(arena, direct_vm, direct_bob)
    review(arena, direct_vm)
    with direct_vm.expect_revert('conclusive review'):
        arena.review_work('bounty-001',0)

@pytest.mark.parametrize('ids', [[True], [0], [-1], ['1'], [1,1], []])
def test_invalid_source_ids_inconclusive(arena, direct_vm, direct_bob, ids):
    submit(arena, direct_vm, direct_bob)
    review(arena, direct_vm, passages=ids)
    assert state(arena)['entries'][0]['review']['decision'] == 'inconclusive'

def test_separate_source_passages_are_extracted_verbatim(arena, direct_vm, direct_bob):
    submit(arena, direct_vm, direct_bob)
    body = 'Request accounts using eth_requestAccounts.\n\nUnrelated explanation.\nSwitch with wallet_switchEthereumChain.'
    direct_vm.mock_web('raw.github', {'status':200,'body':body})
    direct_vm.mock_llm('BOUNTYARENA_REVIEW', {'criteria':[{'met':True,'reason':'Both required operations are shown.','passages':[1,3],'quote':'Invented ... text must never be stored.'}]})
    arena.review_work('bounty-001',0)
    result=state(arena)['entries'][0]['review']
    assert result['decision']=='qualified'
    assert result['criteria'][0]['quotes']==[body.splitlines()[0],body.splitlines()[3]]
    assert 'Invented' not in result['criteria'][0]['quote']
    assert direct_vm.run_validator() is True

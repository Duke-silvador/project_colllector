import pytest
from load_scores import load_scores


def test_정상_파일의_유효한_학생은_5명이다():
    kept, skipped = load_scores("scores.csv")
    assert len(kept) == 5
    assert len(skipped) == 5


def test_빈_줄은_기록하지_않고_건너뛴다(tmp_path):
    path = tmp_path / "blank_lines.csv"
    path.write_text("name,score\n가나다,10\n\n라마바,20\n", encoding="utf-8")
    kept, skipped = load_scores(path)
    assert kept == [("가나다", 10), ("라마바", 20)]
    assert skipped == []


def test_쉼표가_포함된_이름도_읽는다():
    kept, skipped = load_scores("scores.csv")
    assert ("최,네번", 77) in kept


def test_없는_파일이면_FileNotFoundError가_발생한다():
    with pytest.raises(FileNotFoundError):
        load_scores("없는파일.csv")


def test_헤더만_있는_파일은_빈_결과를_반환한다():
    kept, skipped = load_scores("empty.csv")
    assert kept == []
    assert skipped == []


@pytest.mark.parametrize(
    "score, expected_kept",
    [
        (0, True),
        (100, True),
        (101, False),
    ],
)
def test_점수의_경계값을_확인한다(tmp_path, score, expected_kept):
    path = tmp_path / "boundary.csv"
    path.write_text(f"name,score\n학생,{score}\n", encoding="utf-8")
    kept, skipped = load_scores(path)
    if expected_kept:
        assert kept == [("학생", score)]
        assert skipped == []
    else:
        assert kept == []
        assert len(skipped) == 1
        assert skipped[0][2] == "점수가 0~100 밖"


def test_이상한_파일의_잘못된_행은_이유와_함께_건너뛴다():
    kept, skipped = load_scores("weird.csv")
    assert kept == [("한겨울", 77), ("윤보람", 88)]
    reasons = [item[2] for item in skipped]
    assert "이름이 비어 있음" in reasons
    assert "점수가 비어 있음" in reasons
    assert "점수가 0~100 밖" in reasons
    assert "점수가 정수가 아님" in reasons
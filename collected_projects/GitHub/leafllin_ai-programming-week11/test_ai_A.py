##첨부한 load_scores.py 코드를 분석하고, 해당 함수 load_scores(path)를 검사하는 pytest 테스트 코드를 작성해 주세요.
#
#조건:
#1. 파일 이름은 test_ai_A.py로 사용할 예정입니다.
#2. 테스트 함수 이름은 모두 test_로 시작하게 작성해 주세요.
#3. 정상적인 CSV 파일 읽기, 빈 파일, 파일이 존재하지 않는 경우를 검사해 주세요.
#4. 이름에 쉼표가 포함된 경우와 중복된 이름이 있는 경우도 검사해 주세요.
#5. 점수 0, 100, 101을 각각 검사해 주세요.
#6. 잘못된 데이터가 건너뛰어지는지도 검사해 주세요.
#7. 코드를 수정하지 말고 테스트 코드만 작성해 주세요.
#8. pytest에서 실행할 수 있도록 전체 코드를 작성해 주세요.
#
#테스트 코드만 출력해 주세요.

import pytest

from load_scores import load_scores


def test_정상적인_csv를_읽는다(tmp_path):
    path = tmp_path / "scores.csv"
    path.write_text(
        "name,score\n가나다,90\n라마바,80\n",
        encoding="utf-8",
    )

    kept, skipped = load_scores(path)

    assert kept == [("가나다", 90), ("라마바", 80)]
    assert skipped == []


def test_빈_파일은_빈_결과를_반환한다(tmp_path):
    path = tmp_path / "empty.csv"
    path.write_text("", encoding="utf-8")

    assert load_scores(path) == ([], [])


def test_헤더만_있는_파일은_빈_결과를_반환한다(tmp_path):
    path = tmp_path / "header_only.csv"
    path.write_text("name,score\n", encoding="utf-8")

    assert load_scores(path) == ([], [])


def test_존재하지_않는_파일은_FileNotFoundError를_발생시킨다(tmp_path):
    path = tmp_path / "missing.csv"

    with pytest.raises(FileNotFoundError):
        load_scores(path)


def test_이름에_쉼표가_포함되어도_읽는다(tmp_path):
    path = tmp_path / "comma_name.csv"
    path.write_text('name,score\n"최,네번",77\n', encoding="utf-8")

    kept, skipped = load_scores(path)

    assert kept == [("최,네번", 77)]
    assert skipped == []


def test_중복된_이름을_모두_유지한다(tmp_path):
    path = tmp_path / "duplicate_names.csv"
    path.write_text(
        "name,score\n가나다,70\n가나다,85\n",
        encoding="utf-8",
    )

    kept, skipped = load_scores(path)

    assert kept == [("가나다", 70), ("가나다", 85)]
    assert skipped == []


@pytest.mark.parametrize(
    ("score", "expected_kept", "expected_reason"),
    [
        ("0", [("학생", 0)], None),
        ("100", [("학생", 100)], None),
        ("101", [], "점수가 0~100 밖"),
    ],
)
def test_점수_경계값을_검사한다(
    tmp_path, score, expected_kept, expected_reason
):
    path = tmp_path / "boundary.csv"
    path.write_text(f"name,score\n학생,{score}\n", encoding="utf-8")

    kept, skipped = load_scores(path)

    assert kept == expected_kept

    if expected_reason is None:
        assert skipped == []
    else:
        assert len(skipped) == 1
        assert skipped[0][2] == expected_reason


def test_잘못된_데이터를_건너뛰고_기록한다(tmp_path):
    path = tmp_path / "invalid_rows.csv"
    path.write_text(
        "name,score\n"
        ",90\n"
        "라마바,\n"
        "마바사,abc\n"
        "바마사,101\n"
        "사마바,10,추가\n"
        "\n"
        "아라마,77\n",
        encoding="utf-8",
    )

    kept, skipped = load_scores(path)

    assert kept == [("아라마", 77)]
    assert [item[2] for item in skipped] == [
        "이름이 비어 있음",
        "점수가 비어 있음",
        "점수가 정수가 아님",
        "점수가 0~100 밖",
        "열 개수가 2가 아님",
    ]

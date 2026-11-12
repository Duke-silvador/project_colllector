#다음 명세를 만족하는 성적 CSV 처리 함수 load_scores(path)를 검사하는 pytest 테스트 코드를 작성해 주세요.
#[프로그램 명세]
#① 목적
#성적 CSV 파일을 읽어 유효한 학생의 이름과 점수를 반환한다.
#② 입력
#CSV 파일 경로를 입력받는다. CSV 파일에는 이름과 점수가 들어 있다.
#③ 출력
#유효한 학생 정보는 kept에 저장하고, 잘못된 데이터는 skipped에 저장한다. 함수는 (kept, skipped)를 반환한다.

#④ 제약 및 점검 항목
#- 파일의 존재 여부를 확인한다.
#- CSV 헤더와 열의 형식을 확인한다.
#- 점수는 정수이며 0 이상 100 이하여야 한다.
#- 이름 또는 점수가 비어 있는 행은 유효하지 않다.
#- 이름에 쉼표가 포함되어 있어도 정상적으로 읽어야 한다.
#- 같은 이름이 여러 번 나와도 각각의 행을 유지한다.
#- 빈 줄은 건너뛰고 오류 기록에 포함하지 않는다.
#
#⑤ 예외
#존재하지 않는 파일을 입력하면 FileNotFoundError가 발생해야 한다.
#헤더만 존재하고 데이터가 없는 파일은 빈 결과를 반환해야 한다.
#
#⑥ 처리 단계
#1. 파일이 존재하고 읽을 수 있는지 확인한다.
#2. 첫 번째 줄의 헤더를 처리한다.
#3. 각 행에서 이름과 점수를 구분한다.
#4. 이름과 점수의 유효성을 검사한다.
#5. 잘못된 행은 건너뛰고 줄 번호와 사유를 기록한다.
#6. 유효한 데이터와 건너뛴 데이터 목록을 반환한다.
#
#[테스트 조건]
#- 정상적인 CSV 파일
#- 빈 줄이 포함된 CSV 파일
#- 쉼표가 포함된 이름
#- 중복된 이름
#- 파일이 존재하지 않는 경우
#- 헤더만 있는 파일
#- 점수 0, 100, 101
#- 이름 누락, 점수 누락, 숫자가 아닌 점수
#
#pytest로 실행할 수 있는 전체 테스트 코드를 작성해 주세요.
#테스트 함수 이름은 모두 test_로 시작하게 해 주세요.
#코드를 수정하지 말고 테스트 코드만 작성해 주세요.
#
#테스트 코드만 출력해 주세요.

import pytest

from load_scores import load_scores


def test_정상적인_csv를_읽는다(tmp_path):
    path = tmp_path / "scores.csv"
    path.write_text("이름,점수\n김하나,85\n이둘,92\n", encoding="utf-8")

    kept, skipped = load_scores(path)

    assert kept == [("김하나", 85), ("이둘", 92)]
    assert skipped == []


def test_빈_줄을_건너뛴다(tmp_path):
    path = tmp_path / "blank_lines.csv"
    path.write_text(
        "이름,점수\n김하나,85\n\n이둘,92\n",
        encoding="utf-8",
    )

    kept, skipped = load_scores(path)

    assert kept == [("김하나", 85), ("이둘", 92)]
    assert skipped == []


def test_쉼표가_포함된_이름을_읽는다(tmp_path):
    path = tmp_path / "comma_name.csv"
    path.write_text('이름,점수\n"김,하나",85\n', encoding="utf-8")

    kept, skipped = load_scores(path)

    assert kept == [("김,하나", 85)]
    assert skipped == []


def test_중복된_이름을_각각_유지한다(tmp_path):
    path = tmp_path / "duplicate_names.csv"
    path.write_text(
        "이름,점수\n김하나,85\n김하나,92\n",
        encoding="utf-8",
    )

    kept, skipped = load_scores(path)

    assert kept == [("김하나", 85), ("김하나", 92)]
    assert skipped == []


def test_존재하지_않는_파일은_FileNotFoundError를_발생시킨다(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_scores(tmp_path / "missing.csv")


def test_헤더만_있는_파일은_빈_결과를_반환한다(tmp_path):
    path = tmp_path / "header_only.csv"
    path.write_text("이름,점수\n", encoding="utf-8")

    assert load_scores(path) == ([], [])


@pytest.mark.parametrize(
    ("score", "expected_kept", "expected_skipped_count"),
    [
        (0, [("학생", 0)], 0),
        (100, [("학생", 100)], 0),
        (101, [], 1),
    ],
)
def test_점수_경계값을_검사한다(
    tmp_path, score, expected_kept, expected_skipped_count
):
    path = tmp_path / "boundary.csv"
    path.write_text(f"이름,점수\n학생,{score}\n", encoding="utf-8")

    kept, skipped = load_scores(path)

    assert kept == expected_kept
    assert len(skipped) == expected_skipped_count


@pytest.mark.parametrize(
    "invalid_row",
    [
        ",85",
        "김하나,",
        "김하나,점수없음",
    ],
)
def test_잘못된_이름이나_점수를_가진_행은_건너뛴다(tmp_path, invalid_row):
    path = tmp_path / "invalid_row.csv"
    path.write_text(
        f"이름,점수\n{invalid_row}\n",
        encoding="utf-8",
    )

    kept, skipped = load_scores(path)

    assert kept == []
    assert len(skipped) == 1
"""Tests for pipeline step 1: punctuation removal."""

from __future__ import annotations

from sentrealm_core.models import DEFAULT_PUNCTUATION_KEEP, DEFAULT_PUNCTUATION_REMOVE
from sentrealm_core.pipeline.line_count import merge_empty_lines
from sentrealm_core.pipeline.punctuation import (
    NORMAL_BOUNDARY_PENALTY,
    STRONG_BOUNDARY_PENALTY,
    PunctuationBoundary,
    remove_punctuation_and_break_lines,
    strip_punctuation_with_boundaries,
)


def _lines(text: str) -> list[str]:
    return merge_empty_lines(text).split("\n")


def test_sentence_terminator_is_hard_and_comma_is_candidate() -> None:
    text = "大家好，欢迎来到今天的节目。今天我们聊聊 AI 技术。"
    sentences = strip_punctuation_with_boundaries(
        text,
        punctuation_remove=DEFAULT_PUNCTUATION_REMOVE,
        punctuation_keep=DEFAULT_PUNCTUATION_KEEP,
    )
    assert [sentence.text for sentence in sentences] == [
        "大家好欢迎来到今天的节目",
        "今天我们聊聊 AI 技术",
    ]
    assert sentences[0].boundaries == (
        PunctuationBoundary(char_offset=3, penalty=STRONG_BOUNDARY_PENALTY),
    )
    assert sentences[1].boundaries == ()


def test_keeps_percent_sign() -> None:
    text = "增长50%，继续。"
    result = remove_punctuation_and_break_lines(
        text,
        punctuation_remove=DEFAULT_PUNCTUATION_REMOVE,
        punctuation_keep=DEFAULT_PUNCTUATION_KEEP,
    )
    assert _lines(result) == ["增长50%继续"]


def test_multi_char_punctuation_em_dash_is_candidate() -> None:
    text = "先说重点——再展开。"
    sentences = strip_punctuation_with_boundaries(
        text,
        punctuation_remove=DEFAULT_PUNCTUATION_REMOVE,
        punctuation_keep=DEFAULT_PUNCTUATION_KEEP,
    )
    assert [sentence.text for sentence in sentences] == ["先说重点再展开"]
    assert sentences[0].boundaries == (
        PunctuationBoundary(char_offset=4, penalty=NORMAL_BOUNDARY_PENALTY),
    )


def test_quotes_and_brackets_create_candidate_boundaries() -> None:
    text = "每当“降息”两个字（再次）登上新闻。"
    sentences = strip_punctuation_with_boundaries(
        text,
        punctuation_remove=DEFAULT_PUNCTUATION_REMOVE,
        punctuation_keep=DEFAULT_PUNCTUATION_KEEP,
    )
    assert [sentence.text for sentence in sentences] == ["每当降息两个字再次登上新闻"]
    assert sentences[0].boundaries == (
        PunctuationBoundary(char_offset=2, penalty=NORMAL_BOUNDARY_PENALTY),
        PunctuationBoundary(char_offset=4, penalty=NORMAL_BOUNDARY_PENALTY),
        PunctuationBoundary(char_offset=7, penalty=NORMAL_BOUNDARY_PENALTY),
        PunctuationBoundary(char_offset=9, penalty=NORMAL_BOUNDARY_PENALTY),
    )


def test_unknown_custom_remove_token_is_strip_only_and_keep_wins() -> None:
    sentences = strip_punctuation_with_boundaries(
        "甲~乙+丙",
        punctuation_remove=["~", "+"],
        punctuation_keep=["+"],
    )
    assert [sentence.text for sentence in sentences] == ["甲乙+丙"]
    assert sentences[0].boundaries == ()


def test_custom_punctuation_categories_in_strip_punctuation() -> None:
    # Promote semicolon ';' to hard break, demote period '。' to candidate break
    text = "第一段；第二段。第三段"
    sentences = strip_punctuation_with_boundaries(
        text,
        punctuation_hard_breaks=[";", "；"],
        punctuation_candidates=["。"],
        punctuation_remove_only=[],
        punctuation_keep=[],
    )
    assert [sentence.text for sentence in sentences] == ["第一段", "第二段第三段"]
    assert sentences[0].boundaries == ()
    assert sentences[1].boundaries == (
        PunctuationBoundary(char_offset=3, penalty=NORMAL_BOUNDARY_PENALTY),
    )


def test_remove_only_tokens_produce_no_boundaries() -> None:
    text = "划重点#关键信息*"
    sentences = strip_punctuation_with_boundaries(
        text,
        punctuation_hard_breaks=[],
        punctuation_candidates=[],
        punctuation_remove_only=["#", "*"],
        punctuation_keep=[],
    )
    assert [sentence.text for sentence in sentences] == ["划重点关键信息"]
    assert sentences[0].boundaries == ()


def test_master_switch_disabled_retains_punctuation() -> None:
    text = "你好，世界！\n第二行。"
    sentences = strip_punctuation_with_boundaries(
        text,
        punctuation_hard_breaks=[],
        punctuation_candidates=[],
        punctuation_remove_only=[],
        punctuation_keep=[],
        punctuation_remove=[],
    )
    assert [sentence.text for sentence in sentences] == ["你好，世界！", "第二行。"]
    assert sentences[0].boundaries == ()
    assert sentences[1].boundaries == ()

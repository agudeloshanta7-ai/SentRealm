import {
  CheckIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  SettingsIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_PUNCTUATION_CANDIDATES,
  DEFAULT_PUNCTUATION_HARD_BREAK,
  DEFAULT_PUNCTUATION_KEEP,
  DEFAULT_PUNCTUATION_REMOVE_ONLY,
  PRESET_MAX_CHARS,
} from "@/lib/settings-defaults";
import {
  formatPunctuationTokens,
  parsePunctuationTokens,
  resolvePunctuationSettings,
} from "@/lib/text-utils";
import { testLlmConnection } from "@/lib/api";
import type { FlowState, LlmKeyStatus, Settings } from "@/lib/types";

type SettingsDrawerProps = {
  open: boolean;
  baseUrl?: string;
  settings: Settings;
  llmKeyStatus: LlmKeyStatus;
  saving: boolean;
  onClose: () => void;
  onChange: (settings: Settings) => void;
  onSave: () => void;
  onPresentChange?: (present: boolean) => void;
};

function validateSettings(settings: Settings): string | null {
  if (settings.preset === "custom" && settings.max_chars < 1) {
    return "单行最大字数至少为 1";
  }
  if (settings.min_chars < 1) {
    return "单行最小字数至少为 1";
  }
  if (settings.min_chars > settings.max_chars) {
    return "最小字数不能大于最大字数";
  }
  if (settings.llm_enabled && settings.llm_endpoint.trim()) {
    try {
      new URL(settings.llm_endpoint.trim());
    } catch {
      return "LLM API 端点不是有效 URL";
    }
  }
  return null;
}

const PRESET_SEG_OPTIONS = [
  ["landscape", "横屏 15"],
  ["portrait", "竖屏 10"],
  ["custom", "自定义"],
] as const;

function DrawerPresetSeg({
  preset,
  layoutReady,
  onSelect,
}: {
  preset: Settings["preset"];
  layoutReady: boolean;
  onSelect: (preset: Settings["preset"]) => void;
}) {
  const segRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ left: 0, width: 0 });

  const updateThumb = useCallback(() => {
    const seg = segRef.current;
    if (!seg) return;
    const active = seg.querySelector<HTMLButtonElement>("button.is-on");
    if (!active) return;
    setThumb({ left: active.offsetLeft, width: active.offsetWidth });
  }, []);

  useEffect(() => {
    if (!layoutReady) return;
    const frame = requestAnimationFrame(updateThumb);
    return () => cancelAnimationFrame(frame);
  }, [layoutReady, preset, updateThumb]);

  useEffect(() => {
    const seg = segRef.current;
    if (!seg) return;
    const observer = new ResizeObserver(updateThumb);
    observer.observe(seg);
    return () => observer.disconnect();
  }, [updateThumb]);

  return (
    <div className="shell-drawer-seg" ref={segRef}>
      <span
        className="shell-drawer-seg-thumb"
        style={{
          transform: `translateX(${thumb.left}px)`,
          width: thumb.width,
        }}
        aria-hidden
      />
      {PRESET_SEG_OPTIONS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={preset === value ? "is-on" : undefined}
          onClick={() => onSelect(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function DrawerCustomMaxCharsRow({
  visible,
  maxChars,
  onMaxCharsChange,
}: {
  visible: boolean;
  maxChars: number;
  onMaxCharsChange: (maxChars: number) => void;
}) {
  const [present, setPresent] = useState(visible);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (visible) {
      setPresent(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setActive(false);
  }, [visible]);

  if (!present) return null;

  return (
    <div
      className={`shell-drawer-custom-wrap ${active ? "is-open" : ""}`}
      onTransitionEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (!active && event.propertyName === "grid-template-rows") {
          setPresent(false);
        }
      }}
    >
      <div className="shell-drawer-custom-inner">
        <div className="shell-row-set">
          <div>
            <div className="shell-row-set-lbl">自定义字数</div>
            <div className="shell-row-set-sub">仅要求 ≥ 1。</div>
          </div>
          <div className="shell-input-row shell-input-row-narrow">
            <input
              className="shell-input-x"
              type="number"
              min={1}
              value={maxChars}
              onChange={(e) =>
                onMaxCharsChange(Number(e.target.value) || 1)
              }
            />
            <span className="shell-input-prefix">字</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsDrawer({
  open,
  baseUrl,
  settings,
  llmKeyStatus,
  saving,
  onClose,
  onChange,
  onSave,
  onPresentChange,
}: SettingsDrawerProps) {
  const [present, setPresent] = useState(open);
  const [active, setActive] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    onPresentChange?.(present);
  }, [onPresentChange, present]);

  useEffect(() => {
    setTestResult(null);
  }, [settings.llm_endpoint, settings.llm_model]);

  const handleTestLlm = async () => {
    if (!baseUrl) return;
    setTestingLlm(true);
    setTestResult(null);
    const start = performance.now();
    try {
      const res = await testLlmConnection(baseUrl);
      const duration = Math.round(performance.now() - start);
      if (res.ok) {
        setTestResult({ ok: true, message: `连接成功 · ${duration}ms` });
      } else {
        setTestResult({ ok: false, message: res.message || "连接测试未通过" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ ok: false, message: msg || "网络或服务异常" });
    } finally {
      setTestingLlm(false);
    }
  };

  useEffect(() => {
    if (open) {
      setPresent(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setActive(false);
  }, [open]);

  if (!present) return null;

  const currentHard = settings.punctuation_hard_breaks ?? DEFAULT_PUNCTUATION_HARD_BREAK;
  const currentCand = settings.punctuation_candidates ?? DEFAULT_PUNCTUATION_CANDIDATES;
  const currentRemOnly = settings.punctuation_remove_only ?? DEFAULT_PUNCTUATION_REMOVE_ONLY;
  const currentKeep = settings.punctuation_keep ?? DEFAULT_PUNCTUATION_KEEP;

  const removeEnabled =
    settings.punctuation_remove.length > 0 ||
    currentHard.length > 0 ||
    currentCand.length > 0 ||
    currentRemOnly.length > 0;

  const arraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  const punctuationDefaultsApplied =
    arraysEqual(currentHard, DEFAULT_PUNCTUATION_HARD_BREAK) &&
    arraysEqual(currentCand, DEFAULT_PUNCTUATION_CANDIDATES) &&
    arraysEqual(currentRemOnly, DEFAULT_PUNCTUATION_REMOVE_ONLY) &&
    arraysEqual(currentKeep, DEFAULT_PUNCTUATION_KEEP);

  const setRemoveEnabled = (enabled: boolean) => {
    if (enabled) {
      onChange({
        ...settings,
        ...resolvePunctuationSettings({
          keep: currentKeep.length > 0 ? currentKeep : [...DEFAULT_PUNCTUATION_KEEP],
          hard: [...DEFAULT_PUNCTUATION_HARD_BREAK],
          candidates: [...DEFAULT_PUNCTUATION_CANDIDATES],
          removeOnly: [...DEFAULT_PUNCTUATION_REMOVE_ONLY],
        }),
      });
    } else {
      onChange({
        ...settings,
        punctuation_remove: [],
        punctuation_hard_breaks: [],
        punctuation_candidates: [],
        punctuation_remove_only: [],
      });
    }
  };

  const handlePunctuationCategoryChange = (
    category: "keep" | "hard" | "candidates" | "removeOnly",
    rawVal: string,
  ) => {
    const parsed = parsePunctuationTokens(rawVal);
    const updated = {
      keep: category === "keep" ? parsed : currentKeep,
      hard: category === "hard" ? parsed : currentHard,
      candidates: category === "candidates" ? parsed : currentCand,
      removeOnly: category === "removeOnly" ? parsed : currentRemOnly,
    };
    onChange({
      ...settings,
      ...resolvePunctuationSettings(updated),
    });
  };

  const handleResetPunctuationDefaults = () => {
    onChange({
      ...settings,
      ...resolvePunctuationSettings({
        keep: [...DEFAULT_PUNCTUATION_KEEP],
        hard: [...DEFAULT_PUNCTUATION_HARD_BREAK],
        candidates: [...DEFAULT_PUNCTUATION_CANDIDATES],
        removeOnly: [...DEFAULT_PUNCTUATION_REMOVE_ONLY],
      }),
    });
  };

  const llmReady =
    settings.llm_enabled &&
    llmKeyStatus.configured &&
    settings.llm_endpoint.trim() &&
    settings.llm_model.trim();
  const validationError = validateSettings(settings);

  const llmStatusTitle = llmReady
    ? "LLM 已就绪"
    : llmKeyStatus.configured
      ? settings.llm_enabled
        ? "LLM 配置未完成"
        : "LLM 未启用"
      : "未配置 LLM";

  const llmStatusBody = llmReady
    ? "规则后仍超长的行将尝试语义切分，不改写用词。"
    : llmKeyStatus.configured
      ? settings.llm_enabled
        ? "请填写有效的 Endpoint 与 Model。"
        : "开启「启用 LLM 断句」并填写 Endpoint 与 Model。"
      : "超长行将仅标记。本地规则照常运行，不会阻断处理流程。";

  return (
    <>
      <div
        className={`shell-drawer-scrim ${active ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`shell-drawer ${active ? "is-open" : ""}`}
        aria-label="设置"
        aria-hidden={!active}
        onTransitionEnd={(event) => {
          if (event.propertyName !== "transform" || active) return;
          setPresent(false);
        }}
      >
        <div className="shell-drawer-head">
          <div className="shell-drawer-title">设置</div>
          <div className="shell-drawer-acts">
            <button
              type="button"
              className="shell-drawer-act-btn"
              title="关闭"
              onClick={onClose}
            >
              <XIcon strokeWidth={1.6} />
            </button>
          </div>
        </div>

        <div className="shell-drawer-body">
          <section className="shell-drawer-section">
            <h3>字数与断句</h3>
            <p className="shell-drawer-desc">
              控制在剪映「文稿匹配」中每条字幕的建议字数。横屏用于常见 16:9
              视频，竖屏用于 9:16 短视频。
            </p>

            <div className="shell-row-set">
              <div>
                <div className="shell-row-set-lbl">预设</div>
                <div className="shell-row-set-sub">横屏 15 / 竖屏 10，或自定义。</div>
              </div>
              <DrawerPresetSeg
                preset={settings.preset}
                layoutReady={active}
                onSelect={(preset) => {
                  const max_chars =
                    preset === "landscape"
                      ? PRESET_MAX_CHARS.landscape
                      : preset === "portrait"
                        ? PRESET_MAX_CHARS.portrait
                        : settings.max_chars;
                  onChange({
                    ...settings,
                    preset,
                    max_chars,
                    min_chars: Math.min(settings.min_chars, max_chars),
                  });
                }}
              />
            </div>

            <DrawerCustomMaxCharsRow
              visible={settings.preset === "custom"}
              maxChars={settings.max_chars}
              onMaxCharsChange={(max_chars) =>
                onChange({
                  ...settings,
                  preset: "custom",
                  max_chars,
                  min_chars: Math.min(settings.min_chars, max_chars),
                })
              }
            />

            <div className="shell-row-set">
              <div>
                <div className="shell-row-set-lbl">最小字数</div>
                <div className="shell-row-set-sub">
                  自动规则切分后每行不少于该字数；完整短句与 LLM 结果例外。须 ≤ 最大字数。
                </div>
              </div>
              <div className="shell-input-row shell-input-row-narrow">
                <input
                  className="shell-input-x"
                  type="number"
                  min={1}
                  max={settings.max_chars}
                  value={settings.min_chars}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 1;
                    onChange({
                      ...settings,
                      min_chars: Math.min(Math.max(1, value), settings.max_chars),
                    });
                  }}
                />
                <span className="shell-input-prefix">字</span>
              </div>
            </div>

            <div className="shell-row-set">
              <div>
                <div className="shell-row-set-lbl">去除标点</div>
                <div className="shell-row-set-sub">
                  按下方分级规则去除标点并断句；关闭时保留原样标点。
                </div>
              </div>
              <button
                type="button"
                className={`shell-toggle-switch ${removeEnabled ? "is-on" : ""}`}
                aria-pressed={removeEnabled}
                aria-label="去除标点"
                onClick={() => setRemoveEnabled(!removeEnabled)}
              />
            </div>

            <div className="shell-punctuation-group">
              <div className="shell-row-stacked">
                <div className="shell-row-set-lbl">保留标点（优先级最高）</div>
                <div className="shell-row-set-sub">
                  原样留在文稿中，不删除也不断句。默认保留 % 和 .。
                </div>
                <input
                  className="shell-input-x"
                  type="text"
                  value={formatPunctuationTokens(currentKeep)}
                  disabled={!removeEnabled}
                  placeholder="% ."
                  aria-label="保留标点"
                  onChange={(e) => handlePunctuationCategoryChange("keep", e.target.value)}
                />
              </div>

              <div className="shell-row-stacked">
                <div className="shell-row-set-lbl">强制断句标点（句末换行）</div>
                <div className="shell-row-set-sub">
                  去除标点并在该符号处结束自然句强制断行。默认 。 ！？ ! ?。
                </div>
                <input
                  className="shell-input-x"
                  type="text"
                  value={formatPunctuationTokens(currentHard)}
                  disabled={!removeEnabled}
                  placeholder="。 ！？ ! ?"
                  aria-label="强制断句标点"
                  onChange={(e) => handlePunctuationCategoryChange("hard", e.target.value)}
                />
              </div>

              <div className="shell-row-stacked">
                <div className="shell-row-set-lbl">候选断句标点（超长时断句）</div>
                <div className="shell-row-set-sub">
                  去除标点，仅当整句超出最大字数时作为断句切分点。默认逗号、分号、顿号、引号等。
                </div>
                <input
                  className="shell-input-x"
                  type="text"
                  value={formatPunctuationTokens(currentCand)}
                  disabled={!removeEnabled}
                  placeholder="， , ； ; ： : 、 —— …"
                  aria-label="候选断句标点"
                  onChange={(e) => handlePunctuationCategoryChange("candidates", e.target.value)}
                />
              </div>

              <div className="shell-row-stacked">
                <div className="shell-row-set-lbl">仅去除标点（不产生断点）</div>
                <div className="shell-row-set-sub">
                  直接从文本中移除，绝不作为断句断点。默认 ％。
                </div>
                <input
                  className="shell-input-x"
                  type="text"
                  value={formatPunctuationTokens(currentRemOnly)}
                  disabled={!removeEnabled}
                  placeholder="％"
                  aria-label="仅去除标点"
                  onChange={(e) => handlePunctuationCategoryChange("removeOnly", e.target.value)}
                />
              </div>

              <div className="shell-punctuation-reset-row">
                <button
                  type="button"
                  className="shell-inline-reset-btn"
                  disabled={!removeEnabled || punctuationDefaultsApplied}
                  onClick={handleResetPunctuationDefaults}
                >
                  <RotateCcwIcon aria-hidden="true" />
                  恢复默认标点规则
                </button>
              </div>
            </div>
          </section>

          <section className="shell-drawer-section">
            <h3>LLM 处理超长行</h3>
            <p className="shell-drawer-desc">
              仅对规则断句后仍超长的行调用 LLM，<b>且不改写内容</b>。需启用开关，且
              endpoint、model 与{" "}
              <code>SENTREALM_LLM_API_KEY</code> 均有效。
            </p>

            <div className={`shell-llm-status ${llmReady ? "is-ready" : ""}`}>
              <span className={`dot ${llmReady ? "" : "is-off"}`} />
              <div>
                <b>{llmStatusTitle}</b>
                {!llmReady && "，超长行将仅标记。"}
                <br />
                {llmStatusBody}
              </div>
            </div>

            <div className="shell-row-set">
              <div>
                <div className="shell-row-set-lbl">启用 LLM 断句</div>
                <div className="shell-row-set-sub">关闭时跳过语义切分步骤。</div>
              </div>
              <button
                type="button"
                className={`shell-toggle-switch ${settings.llm_enabled ? "is-on" : ""}`}
                aria-pressed={settings.llm_enabled}
                aria-label="启用 LLM 断句"
                onClick={() =>
                  onChange({ ...settings, llm_enabled: !settings.llm_enabled })
                }
              />
            </div>

            <div className="shell-row-set">
              <div>
                <div className="shell-row-set-lbl">Endpoint</div>
                <div className="shell-row-set-sub">
                  支持 OpenAI 兼容接口或本地 ollama。默认留空。
                </div>
              </div>
              <div className="shell-input-row shell-input-row-wide">
                <input
                  className="shell-input-x"
                  type="url"
                  value={settings.llm_endpoint}
                  onChange={(e) =>
                    onChange({ ...settings, llm_endpoint: e.target.value })
                  }
                  placeholder="http://localhost:11434/v1"
                />
              </div>
            </div>

            <div className="shell-row-set">
              <div>
                <div className="shell-row-set-lbl">Model</div>
                <div className="shell-row-set-sub">由 endpoint 提供方决定。</div>
              </div>
              <div className="shell-input-row shell-input-row-model">
                <input
                  className="shell-input-x"
                  type="text"
                  value={settings.llm_model}
                  onChange={(e) =>
                    onChange({ ...settings, llm_model: e.target.value })
                  }
                  placeholder="qwen2.5-7b-instruct"
                />
              </div>
            </div>

            <div className="shell-row-set">
              <div>
                <div className="shell-row-set-lbl">API 密钥</div>
                <div className="shell-row-set-sub">
                  仅读取 <code>SENTREALM_LLM_API_KEY</code>{" "}
                  环境变量，本应用不保存任何明文。
                </div>
              </div>
              <span
                className={`shell-drawer-key-pill ${
                  llmKeyStatus.configured ? "is-ready" : ""
                }`}
              >
                <span className="dot" />
                {llmKeyStatus.configured ? "环境变量已配置" : "环境变量未配置"}
              </span>
            </div>

            <div className="shell-row-set">
              <div>
                <div className="shell-row-set-lbl">连接测试</div>
                <div className="shell-row-set-sub">
                  发送轻量探针测试接口连通性。
                </div>
              </div>
              <div className="shell-drawer-test-wrap">
                <button
                  type="button"
                  className="shell-inline-reset-btn"
                  disabled={
                    !baseUrl ||
                    testingLlm ||
                    !settings.llm_endpoint.trim() ||
                    !settings.llm_model.trim()
                  }
                  onClick={() => void handleTestLlm()}
                >
                  {testingLlm ? (
                    <>
                      <LoaderCircleIcon className="size-3.5 animate-spin" />
                      测试中…
                    </>
                  ) : (
                    "测试连接"
                  )}
                </button>
                {testResult && (
                  <span
                    className={`shell-drawer-test-feedback ${
                      testResult.ok ? "is-ok" : "is-err"
                    }`}
                  >
                    <span className="dot" />
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="shell-drawer-section">
            <h3>隐私</h3>
            <div className="shell-privacy-tip">
              <span className="shell-privacy-tip-icon">
                <CheckIcon strokeWidth={1.8} />
              </span>
              <div>
                <b>本地优先</b> · 文稿保存在本机 Documents/SentRealm，可在项目间切换与恢复。
                <br />
                启用 LLM 时，上行内容仅包含触发行的原文片段，不改写用词。
              </div>
            </div>
          </section>
        </div>

        <div className="shell-drawer-foot">
          {validationError && (
            <p className="shell-field-err">{validationError}</p>
          )}
          <button
            type="button"
            className="shell-drawer-btn-secondary"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="shell-drawer-btn-primary"
            disabled={saving || !!validationError}
            onClick={onSave}
          >
            {saving ? (
              <>
                <LoaderCircleIcon className="size-3.5 animate-spin" />
                保存中…
              </>
            ) : (
              <>
                <CheckIcon strokeWidth={1.8} />
                保存
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

export function flowLabel(state: FlowState): string {
  switch (state) {
    case "new":
      return "请先输入文稿";
    case "ready":
      return "已就绪";
    case "running":
      return "正在断句…";
    case "done":
      return "处理完成";
    case "error":
      return "无法处理";
    default:
      return "";
  }
}

export function FlowSpinner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <LoaderCircleIcon className="size-4 animate-spin" />;
}

export function SettingsButton({
  onClick,
  collapsed = false,
}: {
  onClick: () => void;
  collapsed?: boolean;
}) {
  return (
    <button
      type="button"
      className="shell-side-set-btn"
      title="设置 (Ctrl+,)"
      onClick={onClick}
    >
      <SettingsIcon strokeWidth={1.5} />
      {!collapsed && (
        <>
          <span className="shell-side-set-name">设置</span>
          <span className="shell-side-set-shortcut">Ctrl ,</span>
        </>
      )}
    </button>
  );
}

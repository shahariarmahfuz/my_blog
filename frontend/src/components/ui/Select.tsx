import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useId,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string | number;
  defaultValue?: string | number;
  options?: Option[];
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  children?: React.ReactNode;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  onBlur?: (e: any) => void;
}

/**
 * Extracts Option items from children if <option> elements are passed.
 */
function extractOptionsFromChildren(children: React.ReactNode): Option[] {
  const result: Option[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type === 'option' || (child.props && child.props.value !== undefined)) {
      const val = child.props.value !== undefined ? String(child.props.value) : '';
      let lbl = '';

      if (typeof child.props.children === 'string' || typeof child.props.children === 'number') {
        lbl = String(child.props.children);
      } else if (Array.isArray(child.props.children)) {
        lbl = child.props.children
          .map((c: any) => (typeof c === 'string' || typeof c === 'number' ? c : ''))
          .join(' ');
      } else {
        lbl = child.props.label || val;
      }

      result.push({
        value: val,
        label: lbl || val,
        disabled: Boolean(child.props.disabled),
      });
    }
  });
  return result;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      id,
      name,
      label,
      value: controlledValue,
      defaultValue,
      options,
      placeholder,
      error,
      helperText,
      required,
      disabled = false,
      searchable,
      className = '',
      children,
      onChange,
      onBlur,
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState<string>(
      controlledValue !== undefined
        ? String(controlledValue)
        : defaultValue !== undefined
        ? String(defaultValue)
        : ''
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    // Dropdown Portal positioning styles
    const [dropdownStyle, setDropdownStyle] = useState<{
      top?: number;
      bottom?: number;
      left: number;
      width: number;
      maxHeight: number;
    }>({
      left: 0,
      width: 200,
      maxHeight: 280,
    });

    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const listboxRef = useRef<HTMLUListElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    // Sync controlled value
    useEffect(() => {
      if (controlledValue !== undefined) {
        setInternalValue(String(controlledValue));
      }
    }, [controlledValue]);

    // Parse options from prop or children
    const parsedOptions: Option[] = React.useMemo(() => {
      if (options && options.length > 0) {
        return options.map((o) => ({ ...o, value: String(o.value) }));
      }
      if (children) {
        return extractOptionsFromChildren(children);
      }
      return [];
    }, [options, children]);

    // Decide if search should be enabled (auto-searchable if >= 8 options unless explicitly disabled)
    const isSearchable = searchable !== undefined ? searchable : parsedOptions.length >= 8;

    // Filter options by search query
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery.trim()) return parsedOptions;
      const q = searchQuery.toLowerCase().trim();
      return parsedOptions.filter(
        (opt) =>
          opt.label.toLowerCase().includes(q) || String(opt.value).toLowerCase().includes(q)
      );
    }, [parsedOptions, searchQuery]);

    // Find current selected option
    const selectedOption = parsedOptions.find(
      (opt) => String(opt.value) === String(internalValue)
    );

    // Calculate viewport-aware portal position
    const updatePosition = useCallback(() => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();

      // If button is completely off screen, close dropdown
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setIsOpen(false);
        return;
      }

      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const spaceBelow = viewportHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const desiredMaxHeight = 280;

      let openUpward = false;
      let availableHeight = desiredMaxHeight;

      // Intelligently determine direction based on available space
      if (spaceBelow < 200 && spaceAbove > spaceBelow) {
        openUpward = true;
        availableHeight = Math.min(desiredMaxHeight, Math.max(120, spaceAbove - 12));
      } else {
        openUpward = false;
        availableHeight = Math.min(desiredMaxHeight, Math.max(120, spaceBelow - 12));
      }

      // Horizontal position clamped inside viewport
      const width = Math.min(rect.width, viewportWidth - 16);
      const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));

      if (openUpward) {
        setDropdownStyle({
          bottom: viewportHeight - rect.top + 4,
          left,
          width,
          maxHeight: availableHeight,
        });
      } else {
        setDropdownStyle({
          top: rect.bottom + 4,
          left,
          width,
          maxHeight: availableHeight,
        });
      }
    }, []);

    // Handle Open/Close
    const handleOpen = () => {
      if (disabled) return;
      if (!isOpen) {
        updatePosition();
        const idx = filteredOptions.findIndex(
          (opt) => String(opt.value) === String(internalValue)
        );
        setActiveIndex(idx >= 0 ? idx : 0);
      }
      setIsOpen(!isOpen);
      setSearchQuery('');
    };

    const handleClose = useCallback(() => {
      setIsOpen(false);
      setSearchQuery('');
      setActiveIndex(-1);
    }, []);

    // Position calculation on open, window resize, and scroll anywhere on page
    useLayoutEffect(() => {
      if (isOpen) {
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
          window.removeEventListener('resize', updatePosition);
          window.removeEventListener('scroll', updatePosition, true);
        };
      }
    }, [isOpen, updatePosition]);

    // Close on click outside (handles both button DOM and Portal DOM)
    useEffect(() => {
      if (!isOpen) return;

      const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node;
        const clickedInsideButton =
          buttonRef.current && buttonRef.current.contains(target);
        const clickedInsideDropdown =
          dropdownRef.current && dropdownRef.current.contains(target);

        if (!clickedInsideButton && !clickedInsideDropdown) {
          handleClose();
          onBlur?.(e);
        }
      };

      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
      };
    }, [isOpen, handleClose, onBlur]);

    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && isSearchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, isSearchable]);

    // Handle Option Selection
    const handleSelectOption = (opt: Option) => {
      if (opt.disabled) return;
      const val = String(opt.value);
      setInternalValue(val);
      handleClose();

      if (buttonRef.current) {
        buttonRef.current.focus();
      }

      if (onChange) {
        onChange({
          target: {
            value: val,
            name: name,
          },
        });
      }
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          if (!isOpen) {
            e.preventDefault();
            handleOpen();
          } else if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
            e.preventDefault();
            handleSelectOption(filteredOptions[activeIndex]);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            handleOpen();
          } else {
            setActiveIndex((prev) => {
              const next = prev + 1;
              return next < filteredOptions.length ? next : 0;
            });
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) {
            handleOpen();
          } else {
            setActiveIndex((prev) => {
              const next = prev - 1;
              return next >= 0 ? next : filteredOptions.length - 1;
            });
          }
          break;

        case 'Escape':
          e.preventDefault();
          handleClose();
          buttonRef.current?.focus();
          break;

        case 'Tab':
          handleClose();
          break;

        default:
          break;
      }
    };

    // Scroll active item into view
    useEffect(() => {
      if (isOpen && activeIndex >= 0 && listboxRef.current) {
        const item = listboxRef.current.children[activeIndex] as HTMLElement;
        if (item) {
          item.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [activeIndex, isOpen]);

    // Determine Display Label
    const displayLabel = React.useMemo(() => {
      if (selectedOption) {
        return selectedOption.label;
      }
      if (placeholder) {
        return placeholder;
      }
      if (parsedOptions.length > 0 && parsedOptions[0].value === '') {
        return parsedOptions[0].label;
      }
      return 'Select an option';
    }, [selectedOption, placeholder, parsedOptions]);

    const isPlaceholderState = !selectedOption || selectedOption.value === '';

    return (
      <div className="w-full relative">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 select-none"
          >
            {label} {required && <span className="text-rose-500 font-bold">*</span>}
          </label>
        )}

        {/* Custom Dropdown Trigger Button */}
        <button
          ref={(node) => {
            buttonRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as any).current = node;
          }}
          id={selectId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-required={required}
          aria-disabled={disabled}
          disabled={disabled}
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
          className={`w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-left flex items-center justify-between text-sm transition-all shadow-sm outline-none ${
            disabled
              ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed'
              : error
              ? 'border-rose-300 dark:border-rose-700 ring-1 ring-rose-500/20 focus:ring-2 focus:ring-rose-500'
              : isOpen
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
          } ${className}`}
        >
          <span
            className={`truncate pr-2 ${
              isPlaceholderState
                ? 'text-slate-400 dark:text-slate-500 font-normal'
                : 'text-slate-900 dark:text-slate-100 font-medium'
            }`}
          >
            {displayLabel}
          </span>
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
            }`}
          />
        </button>

        {/* Custom Options Popover Rendered via React Portal */}
        {isOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: dropdownStyle.top !== undefined ? `${dropdownStyle.top}px` : undefined,
                bottom:
                  dropdownStyle.bottom !== undefined ? `${dropdownStyle.bottom}px` : undefined,
                left: `${dropdownStyle.left}px`,
                width: `${dropdownStyle.width}px`,
                maxHeight: `${dropdownStyle.maxHeight}px`,
                zIndex: 99999,
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-md animate-fadeIn"
            >
              {/* Search filter input for long lists */}
              {isSearchable && (
                <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-2 bg-slate-50/80 dark:bg-slate-800/60 flex-shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search options..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Options List with independent scroll */}
              <ul
                ref={listboxRef}
                role="listbox"
                aria-label={label || 'Options'}
                className="overflow-y-auto py-1 space-y-0.5 text-xs focus:outline-none flex-1"
                tabIndex={-1}
              >
                {filteredOptions.length === 0 ? (
                  <li className="px-3.5 py-3 text-center text-slate-400 dark:text-slate-500 italic">
                    No matching options found
                  </li>
                ) : (
                  filteredOptions.map((opt, idx) => {
                    const isSelected = String(opt.value) === String(internalValue);
                    const isHighlighted = idx === activeIndex;

                    return (
                      <li
                        key={`${opt.value}-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={opt.disabled}
                        onClick={() => handleSelectOption(opt)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`px-3.5 py-2.5 mx-1 rounded-xl cursor-pointer flex items-center justify-between transition-colors select-none ${
                          opt.disabled
                            ? 'opacity-40 cursor-not-allowed bg-transparent text-slate-400'
                            : isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold'
                            : isHighlighted
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="truncate pr-2">{opt.label}</span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body
          )}

        {/* Error / Helper text */}
        {error && <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>}
        {!error && helperText && (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;

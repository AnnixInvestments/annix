"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface HeroImageOption {
  file: string;
  title: string;
}

const AVAILABLE_IMAGES: HeroImageOption[] = [
  { file: "/au-industries/gallery/gallery29.jpg", title: "Red rubber sheeting on mill rollers" },
  { file: "/au-industries/gallery/gallery30.jpg", title: "Red rubber sheet stack" },
  { file: "/au-industries/gallery/gallery31.jpg", title: "Red rubber roll on mill" },
  { file: "/au-industries/gallery/gallery32.jpg", title: "Yellow AU-branded rubber rolls" },
  { file: "/au-industries/gallery/gallery33.jpg", title: "Red & yellow AU-branded rolls" },
  { file: "/au-industries/gallery/gallery34.jpg", title: "Black AU-branded rubber roll" },
  { file: "/au-industries/gallery/gallery12.jpg", title: "Black rubber compound sheets" },
  { file: "/au-industries/gallery/gallery13.jpg", title: "Black rubber compound close-up" },
  { file: "/au-industries/gallery/gallery14.jpg", title: "Black rubber compound on mill" },
  { file: "/au-industries/gallery/gallery15.jpg", title: "Raw rubber compound on mill" },
  { file: "/au-industries/gallery/gallery16.jpg", title: "Rubber sheeting machine" },
  { file: "/au-industries/gallery/gallery17.jpg", title: "Natural rubber sheeting on rack" },
  { file: "/au-industries/gallery/gallery26.jpg", title: "Pink rubber compound on roller" },
  { file: "/au-industries/gallery/gallery27.jpg", title: "Pink rubber compound stack" },
  { file: "/au-industries/gallery/gallery28.jpg", title: "Pink rubber compound close-up" },
  { file: "/au-industries/gallery/gallery38.jpg", title: "Custom compound West Africa" },
  { file: "/au-industries/gallery/gallery39.jpg", title: "Custom compound close-up" },
  { file: "/au-industries/gallery/gallery40.jpg", title: "Custom compound sheets" },
  { file: "/au-industries/gallery/gallery41.jpg", title: "AU 40 Black uranium mine" },
  { file: "/au-industries/gallery/gallery44.jpg", title: "Pipes with 12mm AU 40 Red" },
  { file: "/au-industries/gallery/gallery47.jpg", title: "Ceramic embedded rubber hoses" },
  { file: "/au-industries/gallery/gallery50.jpg", title: "AU premium 60 Shore fittings" },
  { file: "/au-industries/gallery/gallery52.jpg", title: "AU 40 Black lined fittings" },
  { file: "/au-industries/AUI-banner7.jpg", title: "Rubber sheeting mill (dark)" },
  { file: "/au-industries/AUI-banner8.jpg", title: "Mining plant pipework" },
  { file: "/au-industries/AUI-homeparallax.jpg", title: "Factory floor panorama" },
  { file: "/au-industries/hero-banner.jpg", title: "Mining excavation aerial" },
  { file: "/au-industries/hero-excavator.jpg", title: "Rubber lined pipes in yard" },
  { file: "/au-industries/aui-home01.jpg", title: "Rubber lined pipes warehouse" },
  { file: "/au-industries/aui-home04.jpg", title: "Rubber manufacturing" },
  { file: "/au-industries/aui-home05.jpg", title: "Red rubber sheeting" },
  { file: "/au-industries/aui-home06.jpg", title: "Rubber sheeting machine" },
  { file: "/au-industries/projects-01.jpg", title: "Rubber lining installation" },
  { file: "/au-industries/projects-02.jpg", title: "Blue rubber lined pipes" },
  { file: "/au-industries/projects-03.jpg", title: "Ceramic embedded rubber" },
  { file: "/au-industries/projects-04.jpg", title: "Pipe fabrication delivery" },
];

interface HeroImagePickerProps {
  currentImage: string;
  onSelect: (imageUrl: string) => void;
}

export function HeroImagePicker(props: HeroImagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (file: string) => {
    props.onSelect(file);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
        Choose from Gallery
      </button>
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Choose Hero Image</h2>
            <p className="text-sm text-gray-500">Click an image to select it as the hero banner</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {AVAILABLE_IMAGES.map((img) => {
              const isSelected = props.currentImage === img.file;
              return (
                <button
                  key={img.file}
                  type="button"
                  onClick={() => handleSelect(img.file)}
                  className={`relative rounded-lg overflow-hidden border-3 transition-all hover:scale-[1.02] ${
                    isSelected
                      ? "border-green-500 ring-2 ring-green-500/30"
                      : "border-transparent hover:border-yellow-500"
                  }`}
                >
                  <img
                    src={img.file}
                    alt={img.title}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                    <p className="text-xs text-white truncate">{img.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

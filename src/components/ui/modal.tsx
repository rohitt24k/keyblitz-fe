import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import Search from "@/images/search.svg";
import { Input } from "@/components/ui/input";
import ChaseCursor from "../ChaseCursor";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ModalOptionsProps {
  setContent: (content: ReactNode) => void;
  setHeading: (heading: string) => void;
}

interface ModalHeaderProps {
  heading: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const ModalOptions: React.FC<ModalOptionsProps> = ({
  setContent,
  setHeading,
}) => (
  <div className="flex flex-col">
    <div
      className="hover:bg-accent cursor-pointer px-4 py-2 transition-all duration-150"
      onClick={() => {
        setContent(<ChaseCursor />);
        setHeading("Chase the cursor");
      }}
    >
      Chase the cursor
    </div>
  </div>
);

const ModalOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.7 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    className="fixed inset-0 z-40 bg-black/70"
    onClick={onClose}
  />
);

const ModalContainer: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center px-4 outline-none">
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ duration: 0.15, type: "tween" }}
      className="xs:w-[500px] my-[15vh] w-full flex-1 overflow-hidden"
    >
      <div className="bg-background pointer-events-auto rounded-xl">
        {children}
      </div>
    </motion.div>
  </div>
);

const ModalHeader: React.FC<ModalHeaderProps> = ({ heading, inputRef }) => (
  <div className="text-foreground-light text-xl">
    {heading ? (
      <div className="px-4 py-6 select-none">{heading}</div>
    ) : (
      <label className="text-foreground-light flex items-center gap-4 px-4">
        <Search className="h-6 w-6" />
        <Input
          type="text"
          className="h-auto flex-1 rounded-none border-0 bg-transparent py-6 shadow-none focus-visible:ring-0"
          ref={inputRef}
        />
      </label>
    )}
  </div>
);

const ModalBody: React.FC<{ content: ReactNode }> = ({ content }) => (
  <div>
    <div className="border-border border-t" />
    <div className="text-foreground pb-2">{content}</div>
  </div>
);

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [modalContent, setModalContent] = useState<ReactNode>(null);
  const [modalHeading, setModalHeading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  const resetModalContent = useCallback(() => {
    setModalContent(
      <ModalOptions
        setContent={setModalContent}
        setHeading={setModalHeading}
      />,
    );
    setModalHeading(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      inputRef.current?.focus();
      resetModalContent();
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown, resetModalContent]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <ModalOverlay onClose={onClose} />
          <ModalContainer>
            <ModalHeader heading={modalHeading} inputRef={inputRef} />
            <ModalBody content={modalContent} />
          </ModalContainer>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;

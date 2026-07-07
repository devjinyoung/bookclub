'use client';

import { getLevelInfo } from '@/lib/levels';
import { Button, Modal } from '@heroui/react';

export default function ModalComponent({
  isOpen,
  onClose,
  booksRead,
}: {
  isOpen: boolean;
  onClose: () => void;
  booksRead: number;
}) {
  const levelInfo = getLevelInfo(booksRead);
  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen}>
        <Modal.Container placement="center">
          <Modal.Dialog className="sm:max-w-[360px] bg-slate-900">
            <Modal.Header>
              <Modal.Heading>You Leveled Up!</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p>You are now a {levelInfo.level}!</p>
              <img
                src={`/icons/${levelInfo.level}.png`}
                alt={`${levelInfo.level} icon`}
                className="w-12 h-12"
              />
            </Modal.Body>
            <Modal.Footer>
              <Button className="w-full" onPress={onClose}>
                Continue
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

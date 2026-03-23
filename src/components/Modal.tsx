'use client';

import { Button, Modal } from '@heroui/react';

export default function ModalComponent({
  isOpen,
  onClose,
  level,
}: {
  isOpen: boolean;
  onClose: () => void;
  level: string;
}) {
  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen}>
        <Modal.Container placement="center">
          <Modal.Dialog className="sm:max-w-[360px] bg-slate-900">
            <Modal.Header>
              <Modal.Heading>You Leveled Up!</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p>You are now a {level}!</p>
              <img src={`/icons/${level}.png`} alt={`${level} icon`} className="w-12 h-12" />
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

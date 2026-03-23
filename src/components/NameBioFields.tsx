'use client';

import React from 'react';

type NameBioFieldsProps = {
  nameId: string;
  nameValue: string;
  onNameChange: (value: string) => void;
  bioId: string;
  bioValue: string;
  onBioChange: (value: string) => void;
  nameRequired?: boolean;
  bioRows?: number;
};

export default function NameBioFields({
  nameId,
  nameValue,
  onNameChange,
  bioId,
  bioValue,
  onBioChange,
  nameRequired = false,
  bioRows = 3,
}: NameBioFieldsProps) {
  return (
    <>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200" htmlFor={nameId}>
          Name
        </label>
        <input
          id={nameId}
          type="text"
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 ring-sky-500 focus:border-sky-500 focus:ring-1"
          value={nameValue}
          onChange={(e) => onNameChange(e.target.value)}
          required={nameRequired}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-200" htmlFor={bioId}>
          Bio <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id={bioId}
          rows={bioRows}
          className="w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 ring-sky-500 focus:border-sky-500 focus:ring-1"
          value={bioValue}
          onChange={(e) => onBioChange(e.target.value)}
        />
      </div>
    </>
  );
}

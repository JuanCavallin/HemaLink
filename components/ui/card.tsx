"use client";

import * as React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode };

export function Card({ className = "", ...props }: Props) {
	return (
		<div
			className={`rounded-xl bg-black/40 border border-red-800/20 p-5 backdrop-blur-md shadow-[0_0_20px_rgba(255,0,60,0.1)] ${className}`}
			{...props}
		/>
	);
}

export function CardHeader({ className = "", children, ...props }: Props) {
	return (
		<div className={`mb-3 flex items-center gap-3 ${className}`} {...props}>
			{children}
		</div>
	);
}

export function CardTitle({ className = "", children, ...props }: Props) {
	return (
		<h4 className={`text-lg font-semibold text-white ${className}`} {...props}>
			{children}
		</h4>
	);
}

export function CardContent({ className = "", children, ...props }: Props) {
	return (
		<div className={`mt-2 ${className}`} {...props}>
			{children}
		</div>
	);
}

export default Card;


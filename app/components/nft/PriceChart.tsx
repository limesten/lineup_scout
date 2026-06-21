'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CURRENCIES,
    PRICE_KEY_LABELS,
    TOKEN_SYMBOLS,
    formatPrice,
    type Currency,
    type CurrentPrices,
    type PriceHistory,
    type PriceKey,
} from '@/lib/nft';

interface PriceChartProps {
    combined: PriceHistory;
    perToken: Record<string, PriceHistory>;
    current: Record<PriceKey, CurrentPrices>;
}

const PRICE_KEYS: PriceKey[] = ['combined', ...TOKEN_SYMBOLS];

const chartConfig = {
    price: { label: 'Floor price', color: 'var(--primary)' },
} satisfies ChartConfig;

export function PriceChart({ combined, perToken, current }: PriceChartProps) {
    const [selectedKey, setSelectedKey] = useState<PriceKey>('combined');
    const [currency, setCurrency] = useState<Currency>('EUR');

    const history = selectedKey === 'combined' ? combined : perToken[selectedKey];

    const chartData = useMemo(
        () =>
            history.dates.map((date, i) => ({
                date,
                price: history.currencies[currency][i],
            })),
        [history, currency]
    );

    const currentPrice = current[selectedKey]?.[currency];

    return (
        <Card className="w-full">
            <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <CardTitle>{PRICE_KEY_LABELS[selectedKey]}</CardTitle>
                        {currentPrice !== undefined && (
                            <p className="mt-1 text-2xl font-bold text-primary">
                                {formatPrice(currentPrice, currency)}
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    current floor (incl. 2.5% fee)
                                </span>
                            </p>
                        )}
                    </div>

                    <Select
                        value={currency}
                        onValueChange={(v) => setCurrency(v as Currency)}
                    >
                        <SelectTrigger className="w-24">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CURRENCIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <ToggleGroup
                    type="single"
                    value={selectedKey}
                    onValueChange={(v) => v && setSelectedKey(v as PriceKey)}
                    className="flex-wrap justify-start"
                >
                    {PRICE_KEYS.map((key) => (
                        <ToggleGroupItem
                            key={key}
                            variant="outline"
                            value={key}
                            className="cursor-pointer"
                        >
                            {PRICE_KEY_LABELS[key]}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </CardHeader>

            <CardContent>
                <ChartContainer
                    config={chartConfig}
                    className="h-[450px] w-full"
                >
                    <AreaChart data={chartData} margin={{ left: 8, right: 8 }}>
                        <defs>
                            <linearGradient
                                id="fillPrice"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor="var(--primary)"
                                    stopOpacity={0.35}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--primary)"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={48}
                            tickFormatter={(value: string) =>
                                new Date(value).toLocaleDateString('en-US', {
                                    month: 'short',
                                    year: '2-digit',
                                })
                            }
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={64}
                            tickFormatter={(value: number) =>
                                formatPrice(value, currency)
                            }
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) =>
                                        new Date(value).toLocaleDateString(
                                            'en-US',
                                            {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            }
                                        )
                                    }
                                    formatter={(value) => (
                                        <span className="font-mono font-medium">
                                            {formatPrice(
                                                value as number,
                                                currency
                                            )}
                                        </span>
                                    )}
                                />
                            }
                        />
                        <Area
                            dataKey="price"
                            type="monotone"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fill="url(#fillPrice)"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
